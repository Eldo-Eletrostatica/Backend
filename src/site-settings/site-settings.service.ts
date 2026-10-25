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
import { EstimatorSettingsDto } from './dto/estimator-settings.dto';
import { UpdateEstimatorSettingsDto } from './dto/update-estimator-settings.dto';
import { SiteSetting } from './entities/site-setting.entity';
import {
  applyVisualSettingsPatch,
  DEFAULT_VISUAL_SETTINGS,
  imageUrlsOf,
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

  async getEstimatorSettings(): Promise<EstimatorSettingsDto> {
    return this.estimatorSettingsOf(await this.findSettings());
  }

  async updateEstimatorSettings(
    dto: UpdateEstimatorSettingsDto,
  ): Promise<EstimatorSettingsDto> {
    return this.updateLockedSettings((settings) => {
      settings.isEstimatorEnabled =
        dto.isEnabled ?? settings.isEstimatorEnabled;
      settings.negotiationMargin =
        dto.negotiationMargin ?? settings.negotiationMargin;
      return this.estimatorSettingsOf(settings);
    });
  }

  async getPublishedVisualSettings(): Promise<VisualSettings> {
    return this.publishedOf(await this.findSettings());
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
    return this.updateLockedSettingsAndDeleteUnusedImages((settings) => {
      const currentDraft = this.draftOf(settings);
      settings.visualDraft = currentDraft;
      settings.visualPublished = currentDraft;
      return currentDraft;
    });
  }

  // A null draft starts again as a copy of the published settings.
  async discardVisualDraft(): Promise<VisualSettings> {
    return this.updateLockedSettingsAndDeleteUnusedImages((settings) => {
      settings.visualDraft = null;
      return this.draftOf(settings);
    });
  }

  // Null in both columns means the default defined in code, so a later change
  // of the default also reaches a restored site.
  async restoreDefaultVisualSettings(): Promise<VisualSettings> {
    return this.updateLockedSettingsAndDeleteUnusedImages((settings) => {
      settings.visualPublished = null;
      settings.visualDraft = null;
      return this.publishedOf(settings);
    });
  }

  // The images in use come from the saved row, published and draft, so every
  // action keeps exactly what the site and the editor still show. The new
  // settings are already saved when the cleanup runs; an image left behind by
  // a bucket failure is deleted by the next action that cleans the folder.
  private async updateLockedSettingsAndDeleteUnusedImages<Result>(
    change: (settings: SiteSetting) => Result,
  ): Promise<Result> {
    let usedUrls: (string | null)[] = [];
    const result = await this.updateLockedSettings((settings) => {
      const changeResult = change(settings);
      usedUrls = [
        ...imageUrlsOf(this.publishedOf(settings)),
        ...imageUrlsOf(this.draftOf(settings)),
      ];
      return changeResult;
    });
    await this.storageService
      .deleteUnusedImages(VISUAL_IMAGES_FOLDER, usedUrls)
      .catch((error: unknown) =>
        this.logger.error('Falha ao apagar imagens sem uso do bucket', error),
      );
    return result;
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

  private estimatorSettingsOf(settings: SiteSetting): EstimatorSettingsDto {
    return {
      isEnabled: settings.isEstimatorEnabled,
      negotiationMargin: settings.negotiationMargin,
    };
  }

  private publishedOf(settings: SiteSetting): VisualSettings {
    return settings.visualPublished ?? DEFAULT_VISUAL_SETTINGS;
  }

  // Until the first edit there is no draft: it starts as the published settings.
  private draftOf(settings: SiteSetting): VisualSettings {
    return settings.visualDraft ?? this.publishedOf(settings);
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
