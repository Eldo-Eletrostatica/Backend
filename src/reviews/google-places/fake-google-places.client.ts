import { GooglePlaceDetails, GooglePlacesClient } from './google-places.client';

// Sample reviews in the same shape the Places API returns, used while the
// project has no Google Cloud credentials. Mixes ratings, a review without a
// comment and an author without a photo so the Frontend can be built against
// every case.
const SAMPLE_PLACE_DETAILS: GooglePlaceDetails = {
  googleMapsUri: 'https://maps.google.com/?cid=0',
  reviews: [
    {
      rating: 5,
      text: { text: 'Pintura impecável nos portões da empresa. Recomendo!' },
      authorAttribution: {
        displayName: 'Exemplo Ana Lima',
        uri: 'https://www.google.com/maps/contrib/1',
        photoUri: 'https://lh3.googleusercontent.com/a/sample-1',
      },
      publishTime: '2026-09-28T13:45:00Z',
      googleMapsUri: 'https://www.google.com/maps/reviews/sample-1',
    },
    {
      rating: 4,
      text: { text: 'Ótimo acabamento, só atrasou um dia na entrega.' },
      authorAttribution: {
        displayName: 'Exemplo Bruno Costa',
        uri: 'https://www.google.com/maps/contrib/2',
        photoUri: 'https://lh3.googleusercontent.com/a/sample-2',
      },
      publishTime: '2026-09-15T18:20:00Z',
      googleMapsUri: 'https://www.google.com/maps/reviews/sample-2',
    },
    {
      rating: 3,
      text: { text: 'Serviço bom, mas o atendimento demorou.' },
      authorAttribution: {
        displayName: 'Exemplo Carla Dias',
        uri: 'https://www.google.com/maps/contrib/3',
      },
      publishTime: '2026-08-30T10:05:00Z',
      googleMapsUri: 'https://www.google.com/maps/reviews/sample-3',
    },
    {
      rating: 5,
      authorAttribution: {
        displayName: 'Exemplo Daniel Rocha',
        uri: 'https://www.google.com/maps/contrib/4',
        photoUri: 'https://lh3.googleusercontent.com/a/sample-4',
      },
      publishTime: '2026-08-12T16:40:00Z',
      googleMapsUri: 'https://www.google.com/maps/reviews/sample-4',
    },
    {
      rating: 2,
      text: { text: 'A cor ficou diferente da que eu pedi.' },
      authorAttribution: {
        displayName: 'Exemplo Elisa Martins',
        uri: 'https://www.google.com/maps/contrib/5',
        photoUri: 'https://lh3.googleusercontent.com/a/sample-5',
      },
      publishTime: '2026-07-21T09:30:00Z',
      googleMapsUri: 'https://www.google.com/maps/reviews/sample-5',
    },
  ],
};

export class FakeGooglePlacesClient extends GooglePlacesClient {
  fetchPlaceDetails(): Promise<GooglePlaceDetails> {
    return Promise.resolve(SAMPLE_PLACE_DETAILS);
  }
}
