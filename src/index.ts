import * as redis from 'redis'
import { EventEmitter } from 'events'
import * as StatsDClient from 'statsd-client'

export class StatsDConfig {
    host: string
    port: number
    instance: any

    constructor (host: string = 'localhost', port: number = 8125, statsDInstance: any = null) {
      this.host = host
      this.port = port
      this.instance = statsDInstance
    }
}

export class RedisConfig {
    host: string
    port: number
    constructor (host: string = 'localhost', port: number = 6379) {
      this.host = host
      this.port = port
    }
}

export class PubSubConfig {
  constructor (statsDConfig: StatsDConfig = new StatsDConfig(), redisConfig: RedisConfig = new RedisConfig()) {
    this.statsD = statsDConfig
    this.redis = redisConfig
  }

    statsD: StatsDConfig
    redis: RedisConfig
}

export class PubSub extends EventEmitter {
    _publisher: redis.RedisClient
    _subscriber: redis.RedisClient
    _subscriptions: Map<string, number>
    _publisherReady: boolean
    _subscriberready: boolean
    logger: any
    _sdc: any

    constructor (
      statsDConfig = new StatsDConfig(),
      redisConfig = new RedisConfig(),
      logger = { debug: (param: string) => { console.log(param) } }
    ) {
      super()
      this.logger = logger
      this._subscriptions = new Map()
      this.config = new PubSubConfig(statsDConfig, redisConfig)
      console.log(this.config.redis)

      if (this.config.statsD.instance !== null) {
        this._sdc = this.config.statsD.instance
      } else {
        this._sdc = new StatsDClient({ host: this.config.statsD.host, port: this.config.statsD.port })
      }

      this._publisher = redis.createClient(this.config.redis.port, this.config.redis.host)
      this._subscriber = redis.createClient(this.config.redis.port, this.config.redis.host)

      this._publisher.on('ready', () => {
        this.logger.debug('Publisher Ready')
        this._publisherReady = true
      })

      this._subscriber.on('ready', () => {
        this.logger.debug('Subscriber Ready')
        this._subscriberready = true
      })

      this._publisher.on('connect', () => {
        this.logger.debug(`Publisher connecting ${this._publisher.connected}`)
      })

      this._subscriber.on('connect', () => {
        this.logger.debug(`Subscriber connecting ${this._subscriber.connected}`)
        this.logger.debug(`Subscriber connecting ${(this._subscriber as any).status}`)
      })

      this._publisher.on('reconnecting', (delay, attempt) => {
        this.logger.debug('Publisher reconnecting', delay, attempt)
      })

      this._subscriber.on('reconnecting', (delay, attempt) => {
        this.logger.debug('Subscriber reconnecting', delay, attempt)
      })

      this._publisher.on('warning', (data) => {
        this.logger.debug('Publisher connecting', data)
      })

      this._subscriber.on('warning', (data) => {
        this.logger.debug('Subscriber warning', data)
      })

      this._publisher.on('end', () => {
        this.logger.debug('Publisher ended')
      })

      this._subscriber.on('end', () => {
        this.logger.debug('Subscriber ended')
      })

      this._publisher.on('error', (err) => {
        this.logger.debug(err)
        this._sdc.increment('pubusb.publisher.error')
        this.emit('error', err)
      })

      this._subscriber.on('message', (schannel, smessage) => {
        this.logger.debug(`Received message now emitting on channel: ${schannel}`)
        this._sdc.increment(`pubsub.subscriber.${schannel}`)
        this.emit(schannel, JSON.parse(smessage))
      })

      this._subscriber.on('error', (err) => {
        this.logger.debug(err)
        this._sdc.increment('pubusb.subscriber.error')
        this.emit('error', err)
      })
    }

    subscribe (channel: string) {
      const inc = this._subscriptions.get(channel) + 1
      if (isNaN(inc)) {
        this._subscriptions.set(channel, 1)
        this.logger.debug(`Subscribing to ${channel}`)
        this._subscriber.subscribe(channel)
      } else {
        this._subscriptions.set(channel, inc)
      }
    }

    publish (channel: string, message: any) {
      this.logger.debug(`Publishing to ${channel}`)
      this._sdc.increment(`pubsub.publisher.${channel}`)
      this._publisher.publish(channel, JSON.stringify(message))
    }

    config: PubSubConfig
    ready () {
      return this._publisherReady && this._subscriberready
    }
}
