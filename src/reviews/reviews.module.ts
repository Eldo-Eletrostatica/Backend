import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { GooglePlacesClient } from './google-places/google-places.client';
import { GooglePlacesHttpClient } from './google-places/google-places-http.client';
import { FakeGooglePlacesClient } from './google-places/fake-google-places.client';

// Sample reviews are opt-in: a server that is missing the flag or the Google
// credentials reports Google as unavailable instead of showing fake reviews.
// The factory runs once, at startup, so a missing setting is warned once
// instead of on every request.
export function createGooglePlacesClient(
  configService: ConfigService,
): GooglePlacesClient {
  if (configService.get<string>('USE_SAMPLE_REVIEWS') === 'true') {
    return new FakeGooglePlacesClient();
  }

  const apiKey = configService.get<string>('GOOGLE_PLACES_API_KEY');
  const placeId = configService.get<string>('GOOGLE_PLACE_ID');
  if (!apiKey || !placeId) {
    new Logger(ReviewsModule.name).warn(
      'GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID is not set: /reviews will report Google as unavailable',
    );
  }
  return new GooglePlacesHttpClient(apiKey, placeId);
}

@Module({
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    {
      provide: GooglePlacesClient,
      inject: [ConfigService],
      useFactory: createGooglePlacesClient,
    },
  ],
})
export class ReviewsModule {}
