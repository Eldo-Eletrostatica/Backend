import { Injectable, Logger } from '@nestjs/common';
import { ReviewsResponseDto } from './dto/reviews-response.dto';
import { ReviewDto } from './dto/review.dto';
import {
  GooglePlaceDetails,
  GooglePlaceReview,
  GooglePlacesClient,
} from './google-places/google-places.client';

// Reviews change rarely and every Google call is billed, so reuse the last
// response for a while instead of calling Google on every page view.
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const UNAVAILABLE_RESPONSE: ReviewsResponseDto = {
  isAvailable: false,
  googleProfileUrl: null,
  reviews: [],
};

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  // Kept in memory instead of a table: it is lost on restart, which is fine
  // for a cache, and it avoids storing Google content in our database.
  private cachedResponse: ReviewsResponseDto | null = null;
  private cachedAt = 0;

  constructor(private readonly googlePlacesClient: GooglePlacesClient) {}

  async findAll(): Promise<ReviewsResponseDto> {
    if (this.cachedResponse && this.isCacheFresh()) {
      return this.cachedResponse;
    }

    try {
      const placeDetails = await this.googlePlacesClient.fetchPlaceDetails();
      this.cachedResponse = this.buildResponse(placeDetails);
      this.cachedAt = Date.now();
      return this.cachedResponse;
    } catch (error) {
      this.logger.warn(`Could not fetch Google reviews: ${String(error)}`);
      // Serve stale reviews rather than an empty section while Google is down.
      return this.cachedResponse ?? UNAVAILABLE_RESPONSE;
    }
  }

  private isCacheFresh(): boolean {
    return Date.now() - this.cachedAt < CACHE_TTL_MS;
  }

  private buildResponse(placeDetails: GooglePlaceDetails): ReviewsResponseDto {
    const reviews = (placeDetails.reviews ?? []).map((review) =>
      this.mapToReview(review),
    );

    return {
      isAvailable: true,
      googleProfileUrl: placeDetails.googleMapsUri,
      reviews,
    };
  }

  private mapToReview(googleReview: GooglePlaceReview): ReviewDto {
    return {
      authorName: googleReview.authorAttribution.displayName,
      rating: googleReview.rating,
      comment: googleReview.text?.text ?? '',
      publishedAt: new Date(googleReview.publishTime),
    };
  }
}
