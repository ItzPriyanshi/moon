module.exports = {
   help: ['article'],
   use: 'query | lang',
   tags: ['internet'],
   command: /^(article)$/i,
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
         console.log(e)
         return m.reply(Func.jsonFormat(e))
      }
   },
   premium: true,
}