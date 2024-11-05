(async () => {
   "use strict";
   process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
   require('events').EventEmitter.defaultMaxListeners = 500
   require('./lib/system/config')
   const { MongoDB, PostgresDB, lowdb, CloudDBAdapter, Connection, Plugins } = new (require('@moonr/func'))
   const { loadPlugins, watchPlugins } = Plugins
   const { join } = require('path')
   const { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, openSync } = require('fs')
   const yargs = require('yargs/yargs')
   const { chain } = require('lodash')
   const env = require('./config.json')
   const { Low, JSONFile } = lowdb

   /* dont change */
   global.timestamp = { start: new Date }
   global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
   global.prefix = new RegExp('^[' + (opts['prefix'] || '!+/#.') + ']')

   /** database */
   global.db = new Low(/https?:\/\//.test(env.databaseurl) ? CloudDBAdapter(env.databaseurl) : /mongodb/.test(env.databaseurl) ? new MongoDB(env.databaseurl) : /postgresql/.test(env.databaseurl) ? new PostgresDB(env.databaseurl) : new JSONFile(`database.json`))
   global.loadDatabase = async function loadDatabase() {
      if (global.db.READ) return new Promise((resolve) => setInterval(function () {
         (!global.db.READ ? (clearInterval(this), resolve(global.db.data == null ? global.loadDatabase() : global.db.data)) : null)
      }, 1 * 1000))
      if (global.db.data !== null) return
      global.db.READ = true
      await global.db.read()
      global.db.READ = false
      global.db.data = {
         users: {},
         groups: {},
         chats: {},
         setting: {},
         stats: {},
         msgs: {},
         menfess: {},
         sticker: {},
         chara: '',
         ...(global.db.data || {})
      }
      global.db.chain = chain(global.db.data)
   }
   loadDatabase()

   /* connection */
   const connectionOptions = new Connection({
      session: 'session', /** this is for the folder storing the session */
      online: false, /** in for online view on whatsapp */
      browser: ['Ubuntu', 'Chrome', '20.0.04'] /** this is for the browser version */
   })
   const conn = await connectionOptions.connect()

   /* auto restart if ram usage is over */
   const ramCheck = setInterval(() => {
      var ramUsage = process.memoryUsage().rss
      if (ramUsage >= require('bytes')(env.ram_limit)) {
         clearInterval(ramCheck)
         process.send('reset')
      }
   }, 60 * 1000)

   /* create temp directory if doesn't exists */
   if (!existsSync('./tmp')) mkdirSync('./tmp')

   /* clear temp folder every 10 minutes */
   setInterval(async () => {
      try {
         const tmpFiles = readdirSync('./tmp')
         if (tmpFiles.length > 0) {
            tmpFiles.filter(v => !v.endsWith('.file')).map(v => unlinkSync('./tmp/' + v))
         }
      } catch { }
   }, 60 * 1000 * 10)

   /** save database every 30 seconds */
   setInterval(async () => {
      if (global.db) await global.db.write()
   }, 60_000)

   /** connection event */
   const imports = (path) => {
      path = require.resolve(path)
      let modules, retry = 0
      do {
         if (path in require.cache) delete require.cache[path]
         modules = require(path)
         retry++
      } while ((!modules || (Array.isArray(modules) || modules instanceof String) ? !(modules || []).length : typeof modules == 'object' && !Buffer.isBuffer(modules) ? !(Object.keys(modules || {})).length : true) && retry <= 10)
      return modules
   }
   let isInit = true
   const reloadHandler = function (restatConn) {
      let handler = imports('./handler')

      if (!isInit) {
         conn.ev.off('group-participants.update', conn.participantsUpdate)
         conn.ev.off('groups.update', conn.groupUpdate)
         conn.ev.off('message.delete', conn.onDelete)
         conn.ev.off('call', conn.call)
         conn.ev.off('presence.update', conn.presenceUpdate)
      }

      conn.welcome = 'Thanks @user for joining into @subject group.'
      conn.bye = 'Good bye @user :)'
      conn.spromote = '@user is now admin!'
      conn.sdemote = '@user is now not admin!'
      conn.handler = handler.handler.bind(conn)
      conn.participantsUpdate = handler.participantsUpdate.bind(conn)
      conn.groupUpdate = handler.groupsUpdate.bind(conn)
      conn.onDelete = handler.deleteUpdate.bind(conn)
      conn.call = handler.caller.bind(conn)
      conn.presenceUpdate = handler.presenceUpdate.bind(conn)

      conn.ev.on('group-participants.update', conn.participantsUpdate)
      conn.ev.on('groups.update', conn.groupUpdate)
      conn.ev.on('message.delete', conn.onDelete)
      conn.ev.on('call', conn.call)
      conn.ev.on('presence.update', conn.presenceUpdate)
      isInit = false
      return true
   }

   /** Load all plugins when application starts */
   loadPlugins(conn)
   /** Watch the plugins folder for automatic reloading if anything changes */
   watchPlugins(conn)
   /** reload handler */
   reloadHandler()
})()