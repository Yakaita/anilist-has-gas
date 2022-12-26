const POST_URL = "https://graphql.anilist.co";
const MEDIA_RELATION_TYPE = Object.freeze({
  ADAPTATION: "ADAPTATION",
  PREQUEL: "PREQUEL",
  SEQUEL: "SEQUEL",
  PARENT: "PARENT",
  SIDE_STORY: "SIDE_STORY",
  CHARACTER: "CHARACTER",
  SUMMARY: "SUMMARY",
  ALTERNATIVE: "ALTERNATIVE",
  SPIN_OFF: "SPIN_OFF",
  OTHER: "OTHER",
  SOURCE: "SOURCE",
  COMPILATION: "COMPILATION",
  CONTAINS: "CONTAINS"
});
const MEDIA_FORMAT_TYPE = Object.freeze({
  TV: "TV",
  TV_SHORT: "TV_SHORT",
  MOVIE: "MOVIE",
  SPECIAL: "SPECIAL",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "MUSIC",
  MANGA: "MANGA",
  NOVEL: "NOVEL",
  ONE_SHOT: "ONE_SHOT"
});

/**
 * Returns almost all the data associated with a peice of media. Unless you dont really know what you want I wouldnt use this. Its a lot of data and shouldnt be used frequently. 
 * @author Jeremy Laing (Yakaita)
 * @param {number} id The ID of the media
 * @return {JSON} A json of the data returned by Anilist
 */
function getMediaDataDump(id) {
  let query = `{
    Media(id: ${id}) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      type
      format
      status
      description
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      season
      seasonYear
      seasonInt
      episodes
      duration
      chapters
      volumes
      countryOfOrigin
      isLicensed
      source
      hashtag
      trailer {
        id
        site
        thumbnail
      }
      updatedAt
      coverImage {
        extraLarge
        large
        medium
        color
      }
      bannerImage
      genres
      synonyms
      averageScore
      meanScore
      popularity
      isLocked
      trending
      favourites
      tags {
        id
      }
      relations {
        edges {
          id
        }
      }
      characters {
        edges {
          node {
            id
          }
          role
        }
      }
      staff {
        edges {
          node {
            id
          }
          role
        }
      }
      studios {
        edges {
          node {
            id
          }
          isMain
        }
      }
      isFavouriteBlocked
      isAdult
      externalLinks {
        url
      }
      siteUrl
      modNotes
    }
  }`;

  return getData(query);
}

/**
 * Returns what you want based on your query. 
 * @author Jeremy Laing (Yakaita)
 * @param {String} query The query to request
 * @return {JSON} A json of the data returned by Anilist
 */
function getData(query){
  const request = UrlFetchApp.fetch(POST_URL, {
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify({
      query: query
    })
  });

  const json = JSON.parse(request.getContentText());

  return json;
}

/**
 * Returns all media related to the original media but ignores the relation types given. Basically gets the entire series. This can take a while and will sometimes lead to other series through characters and spin offs. Sleeps every 10 media for 2 seconds to prevent calling too many too quickly
 * @author Jeremy Laing (Yakaita)
 * @param {number} id The ID of the media to start with.
 * @param {Array} ignoreRelationTypes The Relation Types to ignore when getting relations
 * @param {Array} ignoreFormatTypes The media Format Types to ignore when getting relations
 * @return {Object} Two Arrays, one Anime and one Manga with the ID's of the Medias
 */
function getRelatedMediaChain(id, ignoreRelationTypes = [], ignoreFormatTypes = []){
  let relations = {anime: [], manga: []};

  let query = `{
    Media(id: ${id}) {
      id
      type
    }
  }`

  let json = getData(query).data.Media;

  if(json.type === "ANIME") relations.anime.push(json.id);
  else if(json.type === "MANGA") relations.manga.push(json.id);

  let animeTarget = 0;
  let mangaTarget = 0;
  let toFind = -1;
  let animeOldTarget = 1;
  let mangaOldTarget = 1;
  let relationJson = "";
  while(animeTarget < animeOldTarget || mangaTarget < mangaOldTarget){

    if(animeTarget < animeOldTarget && relations.anime.length > 0){
      relationJson = getRelations(relations.anime[animeTarget]).data.Media.relations.edges;

      animeTarget++;
    }
    else if(mangaTarget < mangaOldTarget && relations.manga.length > 0){
      relationJson = getRelations(relations.manga[mangaTarget]).data.Media.relations.edges;

      mangaTarget++;
    }

    for(i = 0; i < relationJson.length; i++){

      if(ignoreRelationTypes.indexOf(relationJson[i].relationType) != -1) continue;
      if(ignoreFormatTypes.indexOf(relationJson[i].node.format) != -1) continue;
      
      toFind = relationJson[i].node.id;
      if(relationJson[i].node.type === "MANGA") relations.manga.indexOf(toFind) === -1 ? relations.manga.push(toFind) : 0;
      else relations.anime.indexOf(toFind) === -1 ? relations.anime.push(toFind) : 0;
    }

    animeOldTarget = relations.anime.length;
    mangaOldTarget = relations.manga.length;

    if((animeOldTarget + mangaOldTarget) % 10 === 0) Utilities.sleep(2000);
  }

  return relations;
}

/**
 * Returns all direct media relations to the given media
 * @author Jeremy Laing (Yakaita)
 * @param {number} id The ID of the media
 * @return {JSON} A JSON that contains the relations of the media
 */
function getRelations(id){
  let query = `{
    Media(id: ${id}) {
      id
      type
      relations{
        edges{
          relationType(version: 2)
          node{
            type
            id
          }
        }
      }
    }
  }`;

  return getData(query);
}
