const Discord = require("discord.js")
const Util = require("util")
const Sequelize = require("sequelize")
const Config = require("./config")

;(async () => {
  const Client = new Discord.Client({disableEveryone: true})
  const DB = new Sequelize("sqlite://", {
    dialect: "sqlite",
    storage: "./counter.db",
    logging: () => {}
  })
  const DBGuilds = DB.define("Guild", {
    id: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    channelId: Sequelize.STRING,
    currentNumber: Sequelize.NUMERIC,
    allowDuplicate: Sequelize.BOOLEAN,
    lastSender: Sequelize.STRING,
    allowComments: Sequelize.BOOLEAN,
    modBypass: Sequelize.BOOLEAN,
    pin500: Sequelize.BOOLEAN
  })
  
  await DBGuilds.sync()

  Client.on("ready", () => {
    Client.user.setPresence({activity: {name: `dans ${Client.guilds.size} serveurs !`}})
  })
  
  Client.on("guildCreate", async Guild => {
    DBGuilds.create({
      id: Guild.id,
      currentNumber: 0,
      allowDuplicate: false,
      channelId: 0,
      lastSender: 0,
      allowComments: false,
      modBypass: false,
      pin500: false
    })
    Client.user.setPresence({activity: {name: `in ${Client.guilds.size} servers!`}})
  })
  
  Client.on("guildDelete", async Guild => {
    DBGuilds.destroy({
      where: {
        id: Guild.id
      }
    })
    Client.user.setPresence({activity: {name: `dans ${Client.guilds.size} serveurs !`}})
  })
  
  Client.on("message", async Message => {
    let Args = Message.content.split(/ +/g)

    if (!await DBGuilds.find({
      where: {
        id: Message.guild.id
      }
    })) DBGuilds.create({
      id: Message.guild.id,
      currentNumber: 0,
      allowDuplicate: false,
      channelId: 0,
      lastSender: 0,
      allowComments: false,
      modBypass: false,
      pin500: false
    })

    let GuildConfig = await DBGuilds.find({
      where: {
        id: Message.guild.id
      }
    })

    if (!Message.member) Message.member = await Message.guild.members.fetch({id: Message.author.id})

    if (Message.channel.id == GuildConfig.channelId) {
      function deleteIfNotMod() {
        if ((!GuildConfig.modBypass && !Message.member.hasPermission("MANAGE_MESSAGES", {checkAdmin: true, checkOwner: true})) || Message.member.id != Config.Owner) return Message.delete()
      }
      if (GuildConfig.allowComments) {
        if (!GuildConfig.allowDuplicate && GuildConfig.lastSender == Message.author.id) return deleteIfNotMod()
        if (Args[0] == GuildConfig.currentNumber + 1) {
          DBGuilds.update({
            currentNumber: GuildConfig.currentNumber + 1,
            lastSender: Message.author.id
          }, {
            where: {
              id: Message.guild.id
            }
          })
          if (GuildConfig.pin500 && (GuildConfig.currentNumber % 500 - 1) == 0) {
            Message.pin()
          }
        } else return deleteIfNotMod()
      } else {
        if (!GuildConfig.allowDuplicate && GuildConfig.lastSender == Message.author.id) return deleteIfNotMod()
        if (Message.content == GuildConfig.currentNumber + 1) {
          DBGuilds.update({
            currentNumber: GuildConfig.currentNumber + 1,
            lastSender: Message.author.id
          }, {
            where: {
              id: Message.guild.id
            }
          })
          if (GuildConfig.pin500 && (GuildConfig.currentNumber % 500 - 1) == 0) {
            Message.pin()
          }
        } else return deleteIfNotMod()
      }
    }
    
    if ((Args[0] == `<@${Client.user.id}>` || Args[0] == `<@!${Client.user.id}>`) && Args[1] == "set") {
      if (!Message.member.hasPermission("MANAGE_GUILD", {checkAdmin: true, checkOwner: true}) && !Message.author.id == Config.Owner) return
      switch ((Args[2]) ? Args[2].toLowerCase() : Args[2]) {
        case "channel": {
          let channel = (Message.guild.channels.get(Args[3].startsWith("<#") ? Args[3].split("<#")[1].split(">")[0] : Args[3])) || Message.guild.channels.find("name", Args[3])
          if (!channel) return
          DBGuilds.update({
            channelId: channel.id
          }, {
            where: {
              id: Message.guild.id
            }
          }).then(() => {
            Message.channel.send(`Réglez le canal de comptage sur <#${channel.id}>.`)
          })
          break
        }
        case "current": {
          let current = parseInt(Args[3]) || 0
          if (current == NaN) return
          DBGuilds.update({
            currentNumber: current
          }, {
            where: {
              id: Message.guild.id
            }
          }).then(() => {
            Message.channel.send(`Définir le numéro actuel sur **${current}**.`)
          })
          break
        }
        case "duplicate": {
          let a3lc = Args[3].toLowerCase()
          let duplicates = (a3lc == "yes" || a3lc == "true" || a3lc == "allow" || a3lc == "allowed" || a3lc == "enabled" || a3lc == "enable") ? true : (a3lc == "no" || a3lc == "false" || a3lc == "deny" || a3lc == "denied" || a3lc == "disallow" || a3lc == "disabled" || a3lc == "disable") ? false : undefined
          if (duplicates == undefined) return
          DBGuilds.update({
            allowDuplicate: duplicates
          }, {
            where: {
              id: Message.guild.id
            }
          }).then(() => {
            Message.channel.send(`Les messages en double sont maintenant **${duplicates ? "activé" : "desactivé"}**.`)
          })
          break
        }
        case "comments": {
          let a3lc = Args[3].toLowerCase()
          let comments = (a3lc == "yes" || a3lc == "true" || a3lc == "allow" || a3lc == "allowed" || a3lc == "enabled" || a3lc == "enable") ? true : (a3lc == "no" || a3lc == "false" || a3lc == "deny" || a3lc == "denied" || a3lc == "disallow" || a3lc == "disabled" || a3lc == "disable") ? false : undefined
          if (comments == undefined) return
          DBGuilds.update({
            allowComments: comments
          }, {
            where: {
              id: Message.guild.id
            }
          }).then(() => {
            Message.channel.send(`Les commentaires sont maintenant **${comments ? "activé" : "desactivé"}**.`)
          })
          break
        }
        case "bypass": {
          let a3lc = Args[3].toLowerCase()
          let bypass = (a3lc == "yes" || a3lc == "true" || a3lc == "allow" || a3lc == "allowed" || a3lc == "enabled" || a3lc == "enable") ? true : (a3lc == "no" || a3lc == "false" || a3lc == "deny" || a3lc == "denied" || a3lc == "disallow" || a3lc == "disabled" || a3lc == "disable") ? false : undefined
          if (bypass == undefined) return
          DBGuilds.update({
            modBypass: bypass
          }, {
            where: {
              id: Message.guild.id
            }
          }).then(() => {
            Message.channel.send(`Le contournement du modérateur est maintenant **${bypass ? "activé" : "desactivé"}**.`)
          })
          break
        }
        case "pin": {
          let a3lc = Args[3].toLowerCase()
          let pin = (a3lc == "yes" || a3lc == "true" || a3lc == "allow" || a3lc == "allowed" || a3lc == "enabled" || a3lc == "enable") ? true : (a3lc == "no" || a3lc == "false" || a3lc == "deny" || a3lc == "denied" || a3lc == "disallow" || a3lc == "disabled" || a3lc == "disable") ? false : undefined
          if (pin == undefined) return
          DBGuilds.update({
            pin500: pin
          }, {
            where: {
              id: Message.guild.id
            }
          }).then(() => {
            Message.channel.send(`L'épinglage est maintenant **${pin ? "activé" : "desactivé"}**.`)
          })
          break
        }
        default: {
          Message.channel.send('Ce n est pas une option de configuration valide ! ```\n@Counter définir le canal (channel|channelname|channelid) -- Définir le canal de comptage.\n@Counter ensemble actuel (nombre) -- Définit le numéro actuel.\n@Counter définir le doublon (yes|no) -- Autoriser plusieurs numéros d un même utilisateur.\n@Counter définir des commentaires (yes|no) -- Autoriser les utilisateurs à ajouter un commentaire à leurs messages.\n@Counter définir la broche (yes|no) -- Épingler tous les 500 numéros.\n@Counter régler le contournement (yes|no) -- Autoriser les modérateurs (Manage Messages permission) pour contourner les restrictions de canal de comptage.```')
        }
      }
    } else if ((Args[0] == `<@${Client.user.id}>` || Args[0] == `<@!${Client.user.id}>`) && Args[1] == "help") {
      Message.channel.send('L aide arrive... ```\n@Counter help -- Ce message.\n@Counter info -- Voir les informations sur le bot & le lien d invite.\n@Counter ensemble -- Modifier la configuration de la guilde (Manage Server, Admin or Server Owner requis)```')
    } else if ((Args[0] == `<@${Client.user.id}>` || Args[0] == `<@!${Client.user.id}>`) && Args[1] == "info") {
      Message.channel.send(`Mon nom est...\`\`\`\nNom: ${Client.user.username}#${Client.user.discriminator}\nID: ${Client.user.id}\nCreateur: @Marceau#4082 (348929802574495744)\nUtilisation de la mémoire : ${~~(process.memoryUsage().heapUsed / (1024 ** 2))}MB/${~~(process.memoryUsage().heapTotal / (1024 ** 2))}MB\n Bibliothèque : Discord v12.0.0\nNode.js: ${process.versions.node}\`\`\`Invite me: https://discordapp.com/oauth2/authorize?client_id=448156517561008128&permissions=11264&scope=bot`)
    } else if ((Args[0] == `<@${Client.user.id}>` || Args[0] == `<@!${Client.user.id}>`) && Args[1] == "ev") {
      if (Message.author.id != Config.Owner) return
      try {
        let evaled = await eval(Args.slice(2).join(" "))
        evaled = (typeof evaled == "string") ? Util.inspect(evaled) : evaled
        Message.channel.send(`**\`SUCCESS:\`**\n\`\`\`${evaled}\`\`\``)
      } catch (err) {
        err = (typeof evaled == "string") ? Util.inspect(err) : err
        Message.channel.send(`**\`ERROR:\`**\n\`\`\`${err}\`\`\``)
      }
    }
  })
  
  Client.login(Config.Token)
})()