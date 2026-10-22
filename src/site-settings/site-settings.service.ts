import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadedImageDto } from '../storage/dto/uploaded-image.dto';
import {
  detectImageFormat,
  UNSUPPORTED_IMAGE_MESSAGE,
} from '../storage/image-format';
import { StorageService } from '../storage/storage.service';
import { SiteSetting } from './entities/site-setting.entity';
import {
  applyVisualSettingsPatch,
  DEFAULT_VISUAL_SETTINGS,
  VisualSettings,
  VisualSettingsPatch,
} from './visual-settings';

// Folder of the bucket with the logo and banner images.
export const VISUAL_IMAGES_FOLDER = 'visual';

@Injectable()
export class SiteSettingsService {
  private readonly logger = new Logger(SiteSettingsService.name);

  constructor(
    @InjectRepository(SiteSetting)
    private readonly siteSettingRepository: Repository<SiteSetting>,
    private readonly storageService: StorageService,
  ) {}

  async uploadVisualImage(content: Buffer): Promise<UploadedImageDto> {
    const format = detectImageFormat(content);
    if (format === null) {
      throw new BadRequestException(UNSUPPORTED_IMAGE_MESSAGE);
    }
    const { url } = await this.storageService.upload(
      { content, ...format },
      VISUAL_IMAGES_FOLDER,
    );
    return { url };
  }

  async getPublishedVisualSettings(): Promise<VisualSettings> {
    const settings = await this.findSettings();
    return settings.visualPublished ?? DEFAULT_VISUAL_SETTINGS;
  }

  async getDraftVisualSettings(): Promise<VisualSettings> {
    return this.draftOf(await this.findSettings());
  }

  async updateDraftVisualSettings(
    patch: VisualSettingsPatch,
  ): Promise<VisualSettings> {
    this.assertImagesFromUpload(patch);
    return this.updateLockedSettings((settings) => {
      settings.visualDraft = applyVisualSettingsPatch(
        this.draftOf(settings),
        patch,
      );
      return settings.visualDraft;
    });
  }

  async publishVisualSettings(): Promise<VisualSettings> {
    const draft = await this.updateLockedSettings((settings) => {
      const currentDraft = this.draftOf(settings);
      settings.visualDraft = currentDraft;
      settings.visualPublished = currentDraft;
      return currentDraft;
    });
    // Draft and published are the same right after publishing, so the draft
    // holds every image still in use. The site already shows the new settings;
    // an image left behind by a failure is deleted on the next publish.
    await this.storageService
      .deleteUnusedImages(VISUAL_IMAGES_FOLDER, [
        draft.logo.imageUrl,
        draft.banner.imageUrl,
      ])
      .catch((error: unknown) =>
        this.logger.error('Falha ao apagar imagens sem uso do bucket', error),
      );
    return draft;
  }

  // Only images sent through the upload route are accepted, so the cleanup on
  // publish knows every image the settings use.
  private assertImagesFromUpload(patch: VisualSettingsPatch): void {
    const imageUrls = [patch.logo?.imageUrl, patch.banner?.imageUrl];
    const hasForeignImage = imageUrls.some(
      (url) =>
        typeof url === 'string' &&
        !this.storageService.isUploadedImageUrl(url, VISUAL_IMAGES_FOLDER),
    );
    if (hasForeignImage) {
      throw new BadRequestException(
        'Envie a imagem pela rota de upload e use a URL devolvida.',
      );
    }
  }

  // Until the first edit there is no draft: it starts as the published settings.
  private draftOf(settings: SiteSetting): VisualSettings {
    return (
      settings.visualDraft ??
      settings.visualPublished ??
      DEFAULT_VISUAL_SETTINGS
    );
  }

  // site_settings holds a single row, created by the SeedSiteSettings migration.
  // The whole visual settings is one jsonb value: without the row lock, two
  // edits at the same time would each save over the other's change.
  private updateLockedSettings<Result>(
    change: (settings: SiteSetting) => Result,
  ): Promise<Result> {
    return this.siteSettingRepository.manager.transaction(async (manager) => {
      const [settings] = await manager.find(SiteSetting, {
        take: 1,
        lock: { mode: 'pessimistic_write' },
      });
      const result = change(requireSettings(settings));
      await manager.save(settings);
      return result;
    });
  }

  private async findSettings(): Promise<SiteSetting> {
    const [settings] = await this.siteSettingRepository.find({ take: 1 });
    return requireSettings(settings);
  }
}

function requireSettings(settings: SiteSetting | undefined): SiteSetting {
  if (settings === undefined) {
    throw new InternalServerErrorException(
      'Registro de configurações do site não encontrado; rode as migrations.',
    );
  }
  return settings;
}
