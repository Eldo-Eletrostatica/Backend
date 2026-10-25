// Subset of the Place Details response of the Google Places API (New):
// https://developers.google.com/maps/documentation/places/web-service/place-details
export interface GooglePlaceReview {
  rating: number;
  text?: { text: string };
  // The policies require showing the author with a link to their profile.
  authorAttribution: { displayName: string; uri?: string; photoUri?: string };
  publishTime: string;
  // Link to this review on Google Maps, also required by the policies.
  googleMapsUri?: string;
}

export interface GooglePlaceDetails {
  googleMapsUri: string;
  reviews?: GooglePlaceReview[];
}

// Abstract class instead of an interface so Nest can use it as the injection
// token: ReviewsModule decides which implementation ReviewsService receives.
export abstract class GooglePlacesClient {
  abstract fetchPlaceDetails(): Promise<GooglePlaceDetails>;
}
