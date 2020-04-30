import * as chai from 'chai'
import { expect, should } from 'chai'
chai.use(require('chai-events'))
import { PubSub, RedisConfig, StatsDConfig } from './index'
import * as redis from 'redis'

describe('PubSub', () => {
    describe('constructor', () => {
        it('uses default localhost and port for config', () => {
            try {
                const pubsub = new PubSub()
                expect(pubsub.config.statsD.host).to.equal('localhost')
                expect(pubsub.config.statsD.port).to.equal(8125)
                expect(pubsub.config.redis.host).to.equal('localhost')
                expect(pubsub.config.redis.port).to.equal(6379)
            } catch(err) {
                console.log(err)
            }
        })
    })

    describe('publish and subscribe', () => {
        it('can publish and listen on a channel', (done) => {
            const channel = 'resources'
            const pubsub = new PubSub(
                new StatsDConfig('localhost', 6379),
                new RedisConfig('localhost', 6379)
            )

            pubsub.subscribe(channel)

            pubsub.on(channel, (message) => {
                expect(message).to.deep.equal({"expecto":"patronum"})
                done()
            })
            setTimeout(()=>{
                pubsub.publish(channel, { "expecto": "patronum" })
            },10)
        })
    })
})
