import { InMemoryMailer } from 'src/core/adapters/in-memory-mailer';
import { InMemoryUserRepository } from 'src/users/adapters/in-memory-user-repository';
import { User } from 'src/users/entities/user.entity';
import { InMemoryParticipationRepository } from 'src/webinars/adapters/participation-repository.in-memory';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { Participation } from 'src/webinars/entities/participation.entity';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { BookSeat } from 'src/webinars/use-cases/book-seat';

describe('Feature: Book a seat', () => {
  let webinarRepository: InMemoryWebinarRepository;
  let participationRepository: InMemoryParticipationRepository;
  let userRepository: InMemoryUserRepository;
  let mailer: InMemoryMailer;
  let useCase: BookSeat;

  const organizer = new User({
    id: 'user-organizer-id',
    email: 'organizer@mail.com',
    password: 'pwd',
  });

  const bob = new User({
    id: 'user-bob-id',
    email: 'bob@mail.com',
    password: 'pwd',
  });

  const webinar = new Webinar({
    id: 'webinar-1',
    organizerId: organizer.props.id,
    title: 'Clean Architecture',
    startDate: new Date('2024-01-10T10:00:00.000Z'),
    endDate: new Date('2024-01-10T11:00:00.000Z'),
    seats: 1,
  });

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([webinar]);
    participationRepository = new InMemoryParticipationRepository();
    userRepository = new InMemoryUserRepository([organizer, bob]);
    mailer = new InMemoryMailer();

    useCase = new BookSeat(
      participationRepository,
      userRepository,
      webinarRepository,
      mailer,
    );
  });

  describe('Scenario: happy path', () => {
    it('should save a participation', async () => {
      await useCase.execute({
        webinarId: webinar.props.id,
        user: bob,
      });

      expect(participationRepository['database']).toEqual([
        new Participation({
          userId: bob.props.id,
          webinarId: webinar.props.id,
        }),
      ]);
    });

    it('should send an email to the organizer', async () => {
      await useCase.execute({
        webinarId: webinar.props.id,
        user: bob,
      });

      expect(mailer.sentEmails).toEqual([
        {
          to: 'organizer@mail.com',
          subject: 'New webinar registration',
          body: 'bob@mail.com has registered to your webinar "Clean Architecture".',
        },
      ]);
    });
  });

  describe('Scenario: user already registered', () => {
    it('should throw an error', async () => {
      participationRepository['database'].push(
        new Participation({
          userId: bob.props.id,
          webinarId: webinar.props.id,
        }),
      );

      await expect(
        useCase.execute({
          webinarId: webinar.props.id,
          user: bob,
        }),
      ).rejects.toThrow('User already participating');
    });
  });

  describe('Scenario: no more seats available', () => {
    it('should throw an error', async () => {
      participationRepository['database'].push(
        new Participation({
          userId: 'another-user-id',
          webinarId: webinar.props.id,
        }),
      );

      await expect(
        useCase.execute({
          webinarId: webinar.props.id,
          user: bob,
        }),
      ).rejects.toThrow('No more seats available');
    });
  });
});
