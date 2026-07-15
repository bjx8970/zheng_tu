import { ValueObject } from '../../shared/kernel';

export interface SubordinateProps {
  id: string;
  name: string;
  ability: number;
  loyalty: number;
  integrity: number;
  subLevel: number;
  appointedRole: string | null;
  appointedDept: string | null;
  appointedAt: number | null;
  transferredCity: string | null;
  isReserve: boolean;
  isFollowing: boolean;
}

export class Subordinate extends ValueObject<SubordinateProps> {
  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get ability(): number { return this.props.ability; }
  get loyalty(): number { return this.props.loyalty; }
  get integrity(): number { return this.props.integrity; }
  get subLevel(): number { return this.props.subLevel; }
  get appointedRole(): string | null { return this.props.appointedRole; }
  get appointedDept(): string | null { return this.props.appointedDept; }
  get isReserve(): boolean { return this.props.isReserve; }
  get isFollowing(): boolean { return this.props.isFollowing; }

  static create(props: SubordinateProps): Subordinate {
    return new Subordinate(props);
  }
}