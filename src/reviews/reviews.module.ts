import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { GooglePlacesClient } from './google-places/google-places.client';
import { GooglePlacesHttpClient } from './google-places/google-places-http.client';
import { FakeGooglePlacesClient } from './google-places/fake-google-places.client';

// Sample reviews are opt-in: a server that is missing the flag or the Google
// credentials reports Google as unavailable instead of showing fake reviews.
export function createGooglePlacesClient(
  configService: ConfigService,
): GooglePlacesClient {
  if (configService.get<string>('USE_SAMPLE_REVIEWS') === 'true') {
    return new FakeGooglePlacesClient();
  }
  return new GooglePlacesHttpClient(
    configService.get<string>('GOOGLE_PLACES_API_KEY'),
    configService.get<string>('GOOGLE_PLACE_ID'),
  );
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
