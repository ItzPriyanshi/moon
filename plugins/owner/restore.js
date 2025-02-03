const { readFileSync } = require('fs')
module.exports = {
   help: ['restore'],
   tags: ['owner'],
   run: async (m, {
      conn,
      command,
      database,
      env,
      Func
   }) => {
      try {
         if (m.quoted && /document/.test(m.quoted.mtype) && m.quoted.mimetype === 'application/json') {
            const fn = await Func.getFile(await m.quoted.download())
            if (!fn.status) return m.reply('File cannot be downloaded.')
            global.db = JSON.parse(readFileSync(fn.file, 'utf-8'))
            m.reply('Database was successfully restored.').then(async () => {
               await database.save(JSON.parse(readFileSync(fn.file, 'utf-8')))
            })
         } else m.reply('Reply to the backup file first then reply with this feature.')
      } catch (e) {
         return conn.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   owner: true
}