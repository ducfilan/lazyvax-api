import { ObjectId } from "mongodb";

export interface Goal {
  _id?: ObjectId;
  title: string;
  type: string;
  atAge?: number;
  fromDate: Date;
  toDate: Date;
  detail?: string;
  alignGoals?: ObjectId[];
  alignAreas?: ObjectId[];
}
