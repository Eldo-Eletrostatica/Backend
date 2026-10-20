import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { UploadedImageDto } from './dto/uploaded-image.dto';
import { SiteSetting } from './entities/site-setting.entity';
import {
  detectImageFormat,
  isUploadedImageName,
  UNSUPPORTED_IMAGE_MESSAGE,
} from './image-format';
import { findUnusedImageKeys } from './unused-images';
import {
  applyVisualSettingsPatch,
  DEFAULT_VISUAL_SETTINGS,
  VisualSettings,
  VisualSettingsPatch,
} from './visual-settings';

// Folder of the bucket with the logo and banner images.
export const VISUAL_IMAGES_FOLDER = 'visual';

// How long an unused upload survives a publish, in case its URL is still on
// the way to the draft. A provider, so the integration tests can set it to 0.
export const IMAGE_CLEANUP_GRACE_PERIOD_MS = 'IMAGE_CLEANUP_GRACE_PERIOD_MS';
export const DEFAULT_IMAGE_CLEANUP_GRACE_PERIOD_MS = 60 * 60 * 1000;

@Injectable()
export class SiteSettingsService {
  private readonly logger = new Logger(SiteSettingsService.name);

  constructor(
    @InjectRepository(SiteSetting)
    private readonly siteSettingRepository: Repository<SiteSetting>,
    private readonly storageService: StorageService,
    @Inject(IMAGE_CLEANUP_GRACE_PERIOD_MS)
    private readonly imageCleanupGracePeriodMs: number,
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
    // The site already shows the new settings; an image left behind is
    // deleted on the next publish.
    await this.deleteUnusedImages(draft).catch((error: unknown) =>
      this.logger.error('Falha ao apagar imagens sem uso do bucket', error),
    );
    return draft;
  }

  // Draft and published are the same right after publishing, so the draft
  // holds every image still in use.
  private async deleteUnusedImages(settings: VisualSettings): Promise<void> {
    const storedImages =
      await this.storageService.listFiles(VISUAL_IMAGES_FOLDER);
    const unusedKeys = findUnusedImageKeys(
      storedImages,
      [settings.logo.imageUrl, settings.banner.imageUrl],
      this.storageService.publicUrl,
      new Date(),
      this.imageCleanupGracePeriodMs,
    );
    await this.storageService.deleteMany(unusedKeys);
  }

  // Only images sent through the upload route are accepted, so the cleanup on
  // publish knows every image the settings use.
  private assertImagesFromUpload(patch: VisualSettingsPatch): void {
    const imagesFolderUrl = `${this.storageService.publicUrl}/${VISUAL_IMAGES_FOLDER}/`;
    const isUploadedImageUrl = (url: string) =>
      url.startsWith(imagesFolderUrl) &&
      isUploadedImageName(url.slice(imagesFolderUrl.length));
    const imageUrls = [patch.logo?.imageUrl, patch.banner?.imageUrl];
    const hasForeignImage = imageUrls.some(
      (url) => typeof url === 'string' && !isUploadedImageUrl(url),
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
