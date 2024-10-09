import { ObjectId } from "mongodb";

export interface Objective {
  _id?: ObjectId;
  title: string;
  type: string;
  fromDate: Date;
  toDate: Date;
  detail?: string;
  alignTargets: ObjectId[];
  areas: ObjectId[];
}
