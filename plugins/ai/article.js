module.exports = {
   help: ['article'],
   use: 'query | lang',
   tags: ['ai'],
   run: async (m, {
      conn,
      usedPrefix,
      command,
      text,
      Func
   }) => {
      try {
         if (!text) return m.reply(Func.example(usedPrefix, command, 'hujan | Indonesian'))
         let [teks, iso] = text.split` | `
         conn.react(m.chat, '🕒', m.key)
         const json = await Api.get('api/ai-article', {
            text: teks, lang: iso
         })
         if (!json.status) return m.reply(Func.jsonFormat(json))
         m.reply(json.data.content)
      } catch (e) {
         return conn.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   premium: true,
}