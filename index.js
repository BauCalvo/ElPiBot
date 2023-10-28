const { Client, GatewayIntentBits } = require('discord.js')
const stringTable = require("string-table")
require('dotenv/config')
const { fetch } = require('undici')
const romans = require('romans');
var fs = require('fs');
const { log } = require('console');

// const bauchoId = "pneU6bUTxo-WXRvm5cODPgQJORFaTYAjM72KWlIDOPf-XtCSLHArWYUJSDzdNJjfWQTjs3KzYDSA3g";
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER']


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
})

client.on('ready', async () => {
    console.log("bot ready");

})

client.on('messageCreate', async message => {
    if (message.content.match("!ultimoGame")) {
        const response = await getLastMatchResultByName(message.content.slice(11));
        message.reply(response)
    }
    else if (message.content.match("!ranking")) {
        console.log(getSummonerId());
        const list = await getRanksArray(getSummonerId())
        const response = stringTable.create(sortByRank(list))
        message.reply(response)
    } else if (message.content.match("!agregar")) {
        console.log(message.content.slice(9));
        const response = await addToListByName(message.content.slice(9));
        message.reply(response + "a");
    }
})



const getLastMatchResultByName = async (name) => {
    try {
        const puuid = await getPuuidByName(name);
        const matches = await getMatchesList(puuid);
        const matchMetaData = await getMatchMetaDataById(matches[0]);

        //obtengo el indice del jugador para buscarlo en la lista de participantes en el objeto info para saber si gano o perdio
        const indexOfPlayer = matchMetaData.metadata.participants.indexOf(puuid);
        //esto me devuevle true si gano y false si perdio
        const win = matchMetaData.info.participants[indexOfPlayer].win;
        return win ? "carriaste hard" : "te fuiste gapeado bro";
    } catch (error) {
        return error.message;
    }
}

const getPuuidByName = async (name) => {
    const response = fetch(`https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}?api_key=${process.env.API_KEY}`);
    const puuid = response
        .then(response => {
            if (response.status === 404) {
                throw new Error("the summoner doesn't exist");
            } else if (response.status === 403) {
                throw new Error('api key expired');
            } else {
                return response.json();
            }
        })
        .then(data => {
            return data.puuid;
        })
    return puuid;
}

const getMatchesList = async (puuid) => {
    const link = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?api_key=${process.env.API_KEY}&start=0&count=10`;
    const matchList = fetch(link)
        .then(response => response.json());
    return matchList;

}
const getMatchMetaDataById = async (matchId) => {
    const response = await fetch(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${process.env.API_KEY}`);
    const matchMetaData = await response.json();
    return matchMetaData;
}



const getRanksArray = async (lista) => {
    return Promise.all(lista.map(async (summonerId) => {
        return await getSoloQueueRankBySID(summonerId);
    }));
}
const getSoloQueueRankBySID = async (summonerId) => {
    let link = `https://la2.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${process.env.API_KEY}`
    const response = await fetch(link);
    //rawData es un array con 2 posiciones, en una la info de flex y en la otra info de solo queue
    const rawData = await response.json();
    let j = rawData.filter(item => item.queueType === "RANKED_SOLO_5x5")
    if(!j){
        return "no tiene rank"; 
    }
    return {
        summonerName: j[0].summonerName,
        tier: j[0].tier,
        rank: j[0].rank,
        lp: j[0].leaguePoints
    }
}
const sortByRank = (lista) => lista.sort(compareRanks);

const compareRanks = (a, b) => {
    let result = 0;
    if ((TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier)) != 0) {
        result = TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier);
    } else {
        if ((romans.deromanize(a.rank) - romans.deromanize(b.rank)) != 0) {
            result = romans.deromanize(a.rank) - romans.deromanize(b.rank);
        } else {
            result = b.lp - a.lp
        }
    }
    return result;
}
const getSummonerId = () => {
    const archivo = fs.readFileSync("./ids.json", "utf-8");
    const parseadito = JSON.parse(archivo);
    return parseadito;
}
const getSummonerIdByName = async (nombre) => {
    const response = fetch(`https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-name/${nombre}?api_key=${process.env.API_KEY}`);
    const summonerId = response.then(res => {

        if (res.status === 404) {
            throw new Error('el nombre de usuario no existe');
        } else if (res.status === 403) {
            throw new Error('api key expirada');
        } else {
            return res.json();
        }
    })
        .then(data => {
            return data.id;
        })
    return summonerId;
}

async function addToListByName(name) {
    try {
        const summonerId = await getSummonerIdByName(name);
        const ids = getSummonerId()
        if (!ids.includes(summonerId)) {
            ids.push(summonerId);
        }
        const json = JSON.stringify(ids, null, 2);
        fs.writeFileSync("./ids.json", json);

        return `${name} fuiste agrgado`
    } catch (error) {
        return error.message;
    }
};


client.login(process.env.TOKEN);