import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_TTL_MS, ReviewsService } from './reviews.service';
import {
  GooglePlaceDetails,
  GooglePlaceReview,
  GooglePlacesClient,
} from './google-places/google-places.client';

function buildGoogleReview(
  overrides: Partial<GooglePlaceReview> = {},
): GooglePlaceReview {
  return {
    rating: 5,
    text: { text: 'Ótimo serviço' },
    authorAttribution: { displayName: 'Maria Souza' },
    publishTime: '2026-09-30T14:00:00Z',
    ...overrides,
  };
}

function buildPlaceDetails(reviews: GooglePlaceReview[]): GooglePlaceDetails {
  return { googleMapsUri: 'https://maps.google.com/?cid=123', reviews };
}

describe('ReviewsService', () => {
  let service: ReviewsService;
  let fetchPlaceDetails: jest.Mock<Promise<GooglePlaceDetails>, []>;

  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-10-18T12:00:00Z') });
    fetchPlaceDetails = jest.fn<Promise<GooglePlaceDetails>, []>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: GooglePlacesClient, useValue: { fetchPlaceDetails } },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    [5, 'Pintura impecável'],
    [3, 'Bom, mas o atendimento demorou'],
    [1, 'A cor ficou diferente da pedida'],
  ])('shows a review rated %i ("%s")', async (rating, comment) => {
    fetchPlaceDetails.mockResolvedValue(
      buildPlaceDetails([
        buildGoogleReview({ rating, text: { text: comment } }),
      ]),
    );

    const response = await service.findAll();

    expect(response.reviews).toEqual([
      expect.objectContaining({ rating, comment }),
    ]);
  });

  it('maps a Google review to the fields shown on the site', async () => {
    fetchPlaceDetails.mockResolvedValue(
      buildPlaceDetails([buildGoogleReview()]),
    );

    const response = await service.findAll();

    expect(response).toEqual({
      isAvailable: true,
      googleProfileUrl: 'https://maps.google.com/?cid=123',
      reviews: [
        {
          authorName: 'Maria Souza',
          rating: 5,
          comment: 'Ótimo serviço',
          publishedAt: new Date('2026-09-30T14:00:00Z'),
        },
      ],
    });
  });

  it('uses an empty comment when the review has only a rating', async () => {
    fetchPlaceDetails.mockResolvedValue(
      buildPlaceDetails([buildGoogleReview({ text: undefined })]),
    );

    const response = await service.findAll();

    expect(response.reviews[0].comment).toBe('');
  });

  it('reuses the cached reviews instead of calling Google again', async () => {
    fetchPlaceDetails.mockResolvedValue(buildPlaceDetails([]));

    await service.findAll();
    await service.findAll();

    expect(fetchPlaceDetails).toHaveBeenCalledTimes(1);
  });

  it('calls Google again once the cache expires', async () => {
    fetchPlaceDetails.mockResolvedValue(buildPlaceDetails([]));

    await service.findAll();
    jest.advanceTimersByTime(CACHE_TTL_MS);
    await service.findAll();

    expect(fetchPlaceDetails).toHaveBeenCalledTimes(2);
  });

  it('serves the last reviews when Google fails after the cache expires', async () => {
    fetchPlaceDetails.mockResolvedValueOnce(
      buildPlaceDetails([buildGoogleReview()]),
    );
    const firstResponse = await service.findAll();

    jest.advanceTimersByTime(CACHE_TTL_MS);
    fetchPlaceDetails.mockRejectedValueOnce(new Error('Google is down'));
    const secondResponse = await service.findAll();

    expect(secondResponse).toEqual(firstResponse);
  });

  it('reports Google as unavailable when it fails and nothing is cached', async () => {
    fetchPlaceDetails.mockRejectedValue(new Error('Google is down'));

    const response = await service.findAll();

    expect(response).toEqual({
      isAvailable: false,
      googleProfileUrl: null,
      reviews: [],
    });
  });
});
