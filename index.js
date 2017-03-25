const connection = process.env.PG
if (!connection) {
	throw new Error('PG environment vairable is missing.')
}

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const Promise = require('bluebird')
const pg = require('pg')
const log = require('totlog')(__filename)

const writeFile = Promise.promisify(fs.writeFile, { context: fs })
const readdir = Promise.promisify(fs.readdir, { context: fs })

const [who, where, database] = connection.slice(11).split(/[@\/]/)
const [host, port = '5432'] = where.split(':')
const [user] = who.split(':')

const client = new pg.Client(connection)
client.connect(e => {
	if (e) {
		log.error(`failed to connect due to ${e.stack}`)
		process.nextTick(() => process.exit(1))
	}
})

const query = Promise.promisify(client.query, { context: client })
const psql = filePath => execSync(`psql -v ON_ERROR_STOP=1 -q -w -h ${host} -U ${user} -d ${database} -f ${filePath}`)

Promise.join(
	getAppliedMigrations(),
	getMigrationFilePaths(),
	setPsqlCredentials(),
	runAll
).tap(() => {
	log.debug('done!')
	process.nextTick(() => process.exit(0))
}).catch({ code: 'ECONNREFUSED' }, e_ => {
	log.warn('pg is not ready yet, try later')
	process.nextTick(() => process.exit(75))
}).catch(e => {
	log.error(`fatal ${e.stack}`)
	process.nextTick(() => process.exit(1))
})

function getAppliedMigrations () {
	return query('select name from migrations').then(r => r.rows)
}

function getMigrationFilePaths () {
	return Promise.resolve(['./', process.env.NODE_ENV ? './staging' : null].filter(Boolean))
		.mapSeries(d => readdir(d).then(files => files.map(f => path.join(d, f))))
		.then(groups => groups.length == 1 ? groups[0] : groups[0].concat(groups[1]))
}

function setPsqlCredentials () {
	return writeFile(`${process.env.HOME}/.pgpass`, `${host}:${port}:${database}:${who}`)
}

function runAll (migrations, filePaths) {
	const index = migrations.reduce((index, value) => Object.assign(index, { [value.name]: true }), { })
	filePaths = filePaths.filter(it => !index[it] && /\.sql$/.test(it))
	filePaths.sort()
	return filePaths.reduce(
		(previous, file) => previous.then(() => runSingle(file)),
		Promise.resolve()
	)
}

function runSingle (filePath) {
	return Promise
		.try(() => psql(filePath))
		.then(() => query('insert into migrations (name) values ($1)', [filePath]))
		.then(() => log.debug(`applied ${filePath}`))
}