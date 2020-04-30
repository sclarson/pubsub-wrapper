const redis = require('redis')

const client = redis.createClient()

client.on('ready', () => {
    console.log('Redis connection ready')
})

client.on('connect', () => {
    console.log('connecting')
})

client.on('error', (err) => {
    console.log(`error occurred ${err}`)
})

client.on('message', (channel, message) => {
    console.log(`Received ${message} on channel ${channel}`)
})

client.on('subscribe', (channel, count) => {
    console.log(`Successfully subscribed to ${channel}  ${count}`)
})

client.subscribe('resources')
