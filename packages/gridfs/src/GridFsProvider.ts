/* eslint-disable require-jsdoc */
'use strict';
import { Stream } from 'stream';
import { Duplex } from 'stream';
import {
  ListResults,
  PutObjectOptions,
  StorageProvider,
} from '@smcloudstore/core/dist/StorageProvider';
import { IsStream } from '@smcloudstore/core/dist/StreamUtils';
import { GridFSBucket, GridFSBucketOptions, MongoClient, ObjectId } from 'mongodb';
import { makeUri, type MongoParams } from './helper';

interface GridFSCreateContainerOptions extends Omit<GridFSBucketOptions, 'bucketName'> {}
interface GridFSPutObjectOptions extends PutObjectOptions {}

export class GridFsProvider extends StorageProvider {
  protected declare _client: MongoClient;

  constructor(connection: MongoParams) {
    super(connection);

    this._provider = 'gridfs';
    this._client = new MongoClient(makeUri(connection));
  }

  // #region functions for containers
  async createContainer(_container: string, _options: Record<string, unknown> = {}): Promise<void> {
    return Promise.resolve();
  }

  async deleteContainer(container: string): Promise<void> {
    const connected = await this._client.connect();
    const db = connected.db();
    const bucket = new GridFSBucket(db, { bucketName: container });
    return await bucket.drop();
  }

  async ensureContainer(_container: string, _options: Record<string, unknown> = {}) {
    return Promise.resolve();
  }

  isContainer(_container: string) {
    return Promise.resolve(true);
  }

  async listContainers(): Promise<string[]> {
    return Promise.resolve([] as string[]);
  }
  // #endregion

  // #region functions for objects
  async getObject(container: string, path: string): Promise<Stream> {
    const connected = await this._client.connect();
    const db = connected.db();
    const bucket = new GridFSBucket(db, { bucketName: container });

    return bucket.openDownloadStreamByName(path);
  }

  async putObject(
    container: string,
    path: string,
    data: Buffer | Stream | string,
    options?: GridFSPutObjectOptions
  ): Promise<void> {
    const connected = await this._client.connect();
    const db = connected.db();
    const bucket = new GridFSBucket(db, { bucketName: container });
    const ws = bucket.openUploadStream(path, options);

    const put = (ds: Stream | Duplex) =>
      new Promise<void>((resolve, reject) => {
        ds.on('error', reject)
          .pipe(ws)
          .on('error', reject)
          .on('finish', () => resolve());
      });

    // eslint-disable-next-line new-cap
    if (IsStream(data)) {
      return put(data as Stream);
    }
    const ds = new Duplex();

    if (typeof data == 'object' && Buffer.isBuffer(data)) {
      ds.push(data);
    } else if (typeof data == 'string') {
      ds.push(data, 'utf8');
    } else {
      throw Error('Invalid data argument: must be a stream, a Buffer or a string');
    }
    ds.push(null);
    return put(ds);
  }

  async listObjects(container: string, _prefix?: string): Promise<ListResults> {
    const db = await this._client.connect();
    return new Promise((resolve, reject) =>
      db.list((err, items) =>
        err ? reject(err) : resolve(items.filter((item) => item.startsWith(container)))
      )
    );
  }

  async deleteObject(container: string, path: string): Promise<void> {
    const connected = await this._client.connect();
    const db = connected.db();
    const bucket = new GridFSBucket(db, { bucketName: container });
    const doc = bucket.find({ filename: path });
    return await bucket.delete(ObjectId(doc._id));
  }
  // #endregion

  // #region functions for presigned url
  async presignedGetUrl(_container: string, _path: string, _ttl?: number): Promise<string> {
    return Promise.resolve('');
  }

  presignedPutUrl(
    _container: string,
    _path: string,
    _options?: GridFSPutObjectOptions,
    _ttl?: number
  ): Promise<string> {
    return Promise.resolve('');
  }
  // #endregion
}
