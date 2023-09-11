const { Client, GatewayIntentBits } = require('discord.js')
const stringTable = require("string-table")
require('dotenv/config')
const {fetch} = require('undici')
const romans = require('romans');

// const bauchoId = "pneU6bUTxo-WXRvm5cODPgQJORFaTYAjM72KWlIDOPf-XtCSLHArWYUJSDzdNJjfWQTjs3KzYDSA3g";
const playersSummonerIds = [process.env.yo,process.env.coca,process.env.cuecin,process.env.juan,process.env.lucas,process.env.valen]
const TIERS = ['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER']

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
})

client.on('ready',async()=>{
    console.log("bot listo");
    // console.log(await getRanksArray(playersSummonerIds));
})

client.on('messageCreate', async message =>{
    if(message.content.match("!ultimoGame")){
        const response = await getLastMatchResultByName(message.content.slice(11));
        message.reply(response)
    }else if(message.content.match("!ranking")){
        const list = await getRanksArray(playersSummonerIds)
        const response =stringTable.create(sortByRank(list))
        message.reply(response)
    }
})


const getPuuidByName = async(name)=>{
    const response = await fetch(`https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}?api_key=${process.env.API_KEY}`);
    console.log(response.ok);
    response.then(res =>
        res.json()).then(d => {
            console.log(d)
        })
 }
// const getPuuidByName = async(name)=>{
//     const fetchResponse = await fetch(`https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}?api_key=${process.env.API_KEY}`).then((response)=>{
//         if(!response.ok){
//             throw new Error("Not 2xx response", {cause: fetchResponse});
//         }else{
//             let data = response.json();
//             return data.puuid;
//         }
//     });
// }
const getMatchesList = async(puuid)=>{
    const link = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?api_key=${process.env.API_KEY}&start=0&count=10`;
    const response = await fetch(link);
    const data = await response.json();
    return data;
}

const getLastMatchResultByName = async(nombre)=>{
    const puuid = await getPuuidByName(nombre)
    const matches =await getMatchesList(puuid);
    const id = matches[0];
    const response = await fetch(`https://americas.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${process.env.API_KEY}`);
    const data = await response.json();
    //obtengo el indice del jugador para buscarlo en la lista de participantes en el objeto info para saber si gano o perdio
    const indexOfPlayer = data.metadata.participants.indexOf(puuid);
    //esto me devuevle true si gano y false si perdio
    const win =data.info.participants[indexOfPlayer].win;
    return win?"carriaste hard":"te fuiste gapeado bro";

}

const getSoloQueueRankBySID = async(summonerId)=>{
    let link = `https://la2.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${process.env.API_KEY}`
    const response = await fetch(link);
    //rawData es un array con 2 posiciones, en la posicion 0 la info de flex y en la posicion 1 la infop de solo queue
    const rawData = await response.json();
    let j = rawData.filter(item=> item.queueType === "RANKED_SOLO_5x5")
    return {
        summonerName:j[0].summonerName,
        tier:j[0].tier,
        rank:j[0].rank,
        lp:j[0].leaguePoints
    }
}
const getRanksArray = async(lista)=>{
    return Promise.all(lista.map(async (item) => {
        return await getSoloQueueRankBySID(item);
      }));
}
const sortByRank = (lista)=>lista.sort(compareRanks);

const compareRanks= (a,b)=>{
    let result = 0;
    if((TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier)) != 0){
        result = TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier);
    }else{
        if((romans.deromanize(a.rank) - romans.deromanize(b.rank)) != 0){
            result = romans.deromanize(a.rank) - romans.deromanize(b.rank);
        }else{
            result = b.lp - a.lp
        }
    }
    return result;
}


client.login(process.env.TOKEN);