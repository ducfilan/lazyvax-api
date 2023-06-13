import winston from 'winston'
import { Env, Envs } from './consts'
import path from 'path'
import fs from 'fs'

const logDirectory = path.join(__dirname, '../logs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

const errorTransport = new winston.transports.File({
  filename: path.join(logDirectory, 'error.log'),
  level: 'error'
})

const infoTransport = new winston.transports.File({
  filename: path.join(logDirectory, 'info.log'),
  level: 'info'
})

const debugTransport = new winston.transports.File({
  filename: path.join(logDirectory, 'debug.log'),
  level: 'debug'
})

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    errorTransport,
    infoTransport,
    debugTransport
  ]
})


if (Env !== Envs.prod) {
  logger.add(new winston.transports.Console({ format }))
}

export default logger
