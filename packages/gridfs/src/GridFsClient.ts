/* eslint-disable require-jsdoc */
'use strict';
import Grid from 'gridfs-stream';
import mongo from 'mongodb';
import { makeUri, type MongoParams } from './helper';

interface GridInstance extends ReturnType<typeof Grid> {}

export interface GridFsConnectionOptions extends MongoParams {}

export class GridFsClient {
  private uri: string;
  constructor(connection: GridFsConnectionOptions) {
    this.uri = makeUri(connection);
  }

  async connect(options?: mongo.MongoClientOptions): Promise<GridInstance> {
    const db = await mongo.MongoClient.connect(this.uri, options);
    // eslint-disable-next-line new-cap
    return Grid(db, mongo);
  }
}
