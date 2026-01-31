import { IMailer } from 'src/core/ports/mailer.interface';
import { Executable } from 'src/shared/executable';
import { User } from 'src/users/entities/user.entity';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { Participation } from 'src/webinars/entities/participation.entity';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';

type Request = {
  webinarId: string;
  user: User;
};
type Response = void;

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly userRepository: IUserRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
  ) {}
  async execute({ webinarId, user }: Request): Promise<Response> {
  const webinar = await this.webinarRepository.findById(webinarId);

  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const participations =
    await this.participationRepository.findByWebinarId(webinarId);

  const alreadyParticipating = participations.some(
    (p) => p.props.userId === user.props.id,
  );

  if (alreadyParticipating) {
    throw new Error('User already participating');
  }

  if (participations.length >= webinar.props.seats) {
    throw new Error('No more seats available');
  }

  await this.participationRepository.save(
    new Participation({
      userId: user.props.id,
      webinarId,
    }),
  );

  const organizer = await this.userRepository.findById(
    webinar.props.organizerId,
  );

  if (!organizer) {
    throw new Error('Organizer not found');
  }

  await this.mailer.send({
    to: organizer.props.email,
    subject: 'New webinar registration',
    body: `${user.props.email} has registered to your webinar "${webinar.props.title}".`,
  });
}
}
