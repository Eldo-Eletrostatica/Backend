import { Injectable, Logger } from '@nestjs/common';
import { todayInBrasilia } from '../common/brasilia-day';
import { ReviewsResponseDto } from './dto/reviews-response.dto';
import { ReviewDto } from './dto/review.dto';
import {
  GooglePlaceDetails,
  GooglePlaceReview,
  GooglePlacesClient,
} from './google-places/google-places.client';

// The Places API policies forbid caching reviews, so every request calls
// Google. The cost is held by limiting calls instead: the reviews field has
// 1,000 free calls a month, and 30 a day fit in it.
export const MAX_GOOGLE_CALLS_PER_DAY = 30;
// After a failure (timeout, quota exceeded), skip Google for a while so
// visitors do not wait for the timeout and a 429 is not hit again.
export const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

const UNAVAILABLE_RESPONSE: ReviewsResponseDto = {
  isAvailable: false,
  googleProfileUrl: null,
  reviews: [],
};

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  // Only counters and times live here, never Google content. They are lost on
  // restart and are per process, which is enough to hold the cost.
  private googleCallsDay = '';
  private googleCallsToday = 0;
  private lastFailureAt: number | null = null;

  constructor(private readonly googlePlacesClient: GooglePlacesClient) {}

  async findAll(): Promise<ReviewsResponseDto> {
    if (this.isPausedAfterFailure() || !this.reserveGoogleCall()) {
      return UNAVAILABLE_RESPONSE;
    }

    try {
      const placeDetails = await this.googlePlacesClient.fetchPlaceDetails();
      this.lastFailureAt = null;
      return this.buildResponse(placeDetails);
    } catch (error) {
      this.lastFailureAt = Date.now();
      this.logger.warn(`Could not fetch Google reviews: ${String(error)}`);
      return UNAVAILABLE_RESPONSE;
    }
  }

  private isPausedAfterFailure(): boolean {
    return (
      this.lastFailureAt !== null &&
      Date.now() - this.lastFailureAt < RETRY_AFTER_FAILURE_MS
    );
  }

  // The count restarts at midnight in Brasília, the company's time zone.
  private reserveGoogleCall(): boolean {
    const today = todayInBrasilia();
    if (today !== this.googleCallsDay) {
      this.googleCallsDay = today;
      this.googleCallsToday = 0;
    }
    if (this.googleCallsToday >= MAX_GOOGLE_CALLS_PER_DAY) {
      return false;
    }

    this.googleCallsToday++;
    if (this.googleCallsToday === MAX_GOOGLE_CALLS_PER_DAY) {
      this.logger.warn(
        `Reached ${MAX_GOOGLE_CALLS_PER_DAY} Google calls today; reviews are unavailable until midnight`,
      );
    }
    return true;
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
    const { authorAttribution } = googleReview;
    return {
      authorName: authorAttribution.displayName,
      authorProfileUrl: authorAttribution.uri ?? null,
      authorPhotoUrl: authorAttribution.photoUri ?? null,
      rating: googleReview.rating,
      comment: googleReview.text?.text ?? '',
      publishedAt: new Date(googleReview.publishTime),
      reviewUrl: googleReview.googleMapsUri ?? null,
    };
  }
}
