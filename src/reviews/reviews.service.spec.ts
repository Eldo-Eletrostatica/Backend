import { Test, TestingModule } from '@nestjs/testing';
import {
  MAX_GOOGLE_CALLS_PER_DAY,
  RETRY_AFTER_FAILURE_MS,
  ReviewsService,
} from './reviews.service';
import { FakeGooglePlacesClient } from './google-places/fake-google-places.client';
import {
  GooglePlaceDetails,
  GooglePlaceReview,
  GooglePlacesClient,
} from './google-places/google-places.client';

const UNAVAILABLE_RESPONSE = {
  isAvailable: false,
  googleProfileUrl: null,
  reviews: [],
};

function buildGoogleReview(
  overrides: Partial<GooglePlaceReview> = {},
): GooglePlaceReview {
  return {
    rating: 5,
    text: { text: 'Ótimo serviço' },
    authorAttribution: {
      displayName: 'Maria Souza',
      uri: 'https://www.google.com/maps/contrib/123',
      photoUri: 'https://lh3.googleusercontent.com/a/maria',
    },
    publishTime: '2026-09-30T14:00:00Z',
    googleMapsUri: 'https://www.google.com/maps/reviews/abc',
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
    // 09:00 in Brasília, far from midnight.
    jest.useFakeTimers({ now: new Date('2026-10-18T12:00:00Z') });
    fetchPlaceDetails = jest
      .fn<Promise<GooglePlaceDetails>, []>()
      .mockResolvedValue(buildPlaceDetails([]));

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

  async function callTimes(times: number): Promise<void> {
    for (let call = 0; call < times; call++) {
      await service.findAll();
    }
  }

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

  it('maps a Google review to the fields shown on the site, with the attribution', async () => {
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
          authorProfileUrl: 'https://www.google.com/maps/contrib/123',
          authorPhotoUrl: 'https://lh3.googleusercontent.com/a/maria',
          rating: 5,
          comment: 'Ótimo serviço',
          publishedAt: new Date('2026-09-30T14:00:00Z'),
          reviewUrl: 'https://www.google.com/maps/reviews/abc',
        },
      ],
    });
  });

  it.each([
    ['comment', { text: undefined }, { comment: '' }],
    [
      'author links',
      { authorAttribution: { displayName: 'Maria Souza' } },
      { authorProfileUrl: null, authorPhotoUrl: null },
    ],
    ['review link', { googleMapsUri: undefined }, { reviewUrl: null }],
  ])(
    'fills a missing %s with an empty value',
    async (_, googleReviewOverrides, expectedFields) => {
      fetchPlaceDetails.mockResolvedValue(
        buildPlaceDetails([buildGoogleReview(googleReviewOverrides)]),
      );

      const response = await service.findAll();

      expect(response.reviews[0]).toMatchObject(expectedFields);
    },
  );

  it('calls Google on every request, without caching the reviews', async () => {
    await callTimes(3);

    expect(fetchPlaceDetails).toHaveBeenCalledTimes(3);
  });

  it('reports Google as unavailable without calling it once the daily limit is reached', async () => {
    await callTimes(MAX_GOOGLE_CALLS_PER_DAY);

    const response = await service.findAll();

    expect(response).toEqual(UNAVAILABLE_RESPONSE);
    expect(fetchPlaceDetails).toHaveBeenCalledTimes(MAX_GOOGLE_CALLS_PER_DAY);
  });

  it.each([
    [
      '2026-10-19T02:59:00Z',
      'still 23:59 in Brasília',
      MAX_GOOGLE_CALLS_PER_DAY,
    ],
    [
      '2026-10-19T03:00:00Z',
      'midnight in Brasília',
      MAX_GOOGLE_CALLS_PER_DAY + 1,
    ],
  ])(
    'after the daily limit, at %s (%s), Google has been called %i times',
    async (instant, _, expectedCalls) => {
      await callTimes(MAX_GOOGLE_CALLS_PER_DAY);

      jest.setSystemTime(new Date(instant));
      await service.findAll();

      expect(fetchPlaceDetails).toHaveBeenCalledTimes(expectedCalls);
    },
  );

  it('reports Google as unavailable when it fails', async () => {
    fetchPlaceDetails.mockRejectedValue(new Error('Google is down'));

    await expect(service.findAll()).resolves.toEqual(UNAVAILABLE_RESPONSE);
  });

  it.each([
    [RETRY_AFTER_FAILURE_MS - 1, 1],
    [RETRY_AFTER_FAILURE_MS, 2],
  ])(
    'after a failure, %i ms later Google has been called %i times',
    async (elapsedMs, expectedCalls) => {
      fetchPlaceDetails.mockRejectedValueOnce(new Error('Google is down'));
      await service.findAll();

      jest.advanceTimersByTime(elapsedMs);
      await service.findAll();

      expect(fetchPlaceDetails).toHaveBeenCalledTimes(expectedCalls);
    },
  );
});

describe('ReviewsService with the sample reviews', () => {
  it('serves the sample reviews with every field the site shows', async () => {
    const service = new ReviewsService(new FakeGooglePlacesClient());

    const response = await service.findAll();

    expect(response.isAvailable).toBe(true);
    expect(response.reviews).toHaveLength(5);
    expect(response.reviews[0]).toEqual({
      authorName: 'Exemplo Ana Lima',
      authorProfileUrl: 'https://www.google.com/maps/contrib/1',
      authorPhotoUrl: 'https://lh3.googleusercontent.com/a/sample-1',
      rating: 5,
      comment: 'Pintura impecável nos portões da empresa. Recomendo!',
      publishedAt: new Date('2026-09-28T13:45:00Z'),
      reviewUrl: 'https://www.google.com/maps/reviews/sample-1',
    });
  });
});
