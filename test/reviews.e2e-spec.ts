import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GooglePlacesClient } from './../src/reviews/google-places/google-places.client';

describe('ReviewsController (e2e)', () => {
  let app: INestApplication<App>;
  const fetchPlaceDetails = jest.fn();

  beforeEach(async () => {
    fetchPlaceDetails.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GooglePlacesClient)
      .useValue({ fetchPlaceDetails })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/reviews (GET) returns the Google reviews with any rating', () => {
    fetchPlaceDetails.mockResolvedValue({
      googleMapsUri: 'https://maps.google.com/?cid=123',
      reviews: [
        {
          rating: 5,
          text: { text: 'Excelente' },
          authorAttribution: { displayName: 'Maria Souza' },
          publishTime: '2026-09-30T14:00:00Z',
        },
        {
          rating: 2,
          text: { text: 'Não gostei' },
          authorAttribution: { displayName: 'João Pereira' },
          publishTime: '2026-09-29T14:00:00Z',
        },
      ],
    });

    return request(app.getHttpServer())
      .get('/reviews')
      .expect(200)
      .expect({
        isAvailable: true,
        googleProfileUrl: 'https://maps.google.com/?cid=123',
        reviews: [
          {
            authorName: 'Maria Souza',
            rating: 5,
            comment: 'Excelente',
            publishedAt: '2026-09-30T14:00:00.000Z',
          },
          {
            authorName: 'João Pereira',
            rating: 2,
            comment: 'Não gostei',
            publishedAt: '2026-09-29T14:00:00.000Z',
          },
        ],
      });
  });

  it('/reviews (GET) reports Google as unavailable when it fails', () => {
    fetchPlaceDetails.mockRejectedValue(new Error('Google is down'));

    return request(app.getHttpServer())
      .get('/reviews')
      .expect(200)
      .expect({ isAvailable: false, googleProfileUrl: null, reviews: [] });
  });
});
