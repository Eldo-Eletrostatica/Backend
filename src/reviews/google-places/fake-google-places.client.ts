import { GooglePlaceDetails, GooglePlacesClient } from './google-places.client';

// Sample reviews in the same shape the Places API returns, used while the
// project has no Google Cloud credentials. Mixes ratings and a review without
// a comment so the Frontend can be built against every case.
const SAMPLE_PLACE_DETAILS: GooglePlaceDetails = {
  googleMapsUri: 'https://maps.google.com/?cid=0',
  reviews: [
    {
      rating: 5,
      text: { text: 'Pintura impecável nos portões da empresa. Recomendo!' },
      authorAttribution: { displayName: 'Exemplo Ana Lima' },
      publishTime: '2026-09-28T13:45:00Z',
    },
    {
      rating: 4,
      text: { text: 'Ótimo acabamento, só atrasou um dia na entrega.' },
      authorAttribution: { displayName: 'Exemplo Bruno Costa' },
      publishTime: '2026-09-15T18:20:00Z',
    },
    {
      rating: 3,
      text: { text: 'Serviço bom, mas o atendimento demorou.' },
      authorAttribution: { displayName: 'Exemplo Carla Dias' },
      publishTime: '2026-08-30T10:05:00Z',
    },
    {
      rating: 5,
      authorAttribution: { displayName: 'Exemplo Daniel Rocha' },
      publishTime: '2026-08-12T16:40:00Z',
    },
    {
      rating: 2,
      text: { text: 'A cor ficou diferente da que eu pedi.' },
      authorAttribution: { displayName: 'Exemplo Elisa Martins' },
      publishTime: '2026-07-21T09:30:00Z',
    },
  ],
};

export class FakeGooglePlacesClient extends GooglePlacesClient {
  fetchPlaceDetails(): Promise<GooglePlaceDetails> {
    return Promise.resolve(SAMPLE_PLACE_DETAILS);
  }
}
