import { ObjectId } from "mongodb";

export interface Objective {
  _id?: ObjectId;
  title: string;
  type: string;
  atAge?: number;
  fromDate: Date;
  toDate: Date;
  detail?: string;
  alignObjectives?: ObjectId[];
  alignAreas?: ObjectId[];
}
