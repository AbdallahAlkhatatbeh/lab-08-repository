'use strict';

// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express = require('express');
const pg = require('pg');
const PORT = process.env.PORT || 4000;
const app = express();

const cors = require('cors');
const superagent = require('superagent');
// Application Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', (err) => {
  throw new Error(err);
});



app.use(cors());

app.get('/', (request, response) => {
  response.send('Home Page!');
});

// Route Definitions
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get(`/trails`, trailsHandler);
app.use('*', notFoundHandler);
app.use(errorHandler);

// Route Handlers

function locationHandler(request, response) {
  // try {
  //   const geoData = require('./data/geo.json');
  //   const city = request.query.city;
  //   const locationData = new Location(city, geoData);
  //   console.log(locationData);
  //   response.status(200).send(locationData);
  // } catch (error) {
  //   errorHandler(
  //     'an error happened while fetching your data!\n' + error,
  //     request,
  //     response
  //   );
  // }
  const city = request.query.city;
  superagent(
    `https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`
  )
    .then((res) => {
      const geoData = res.body;
      const locationData = new Location(city, geoData);
      response.status(200).json(locationData);
    })
    .catch((err) => errorHandler(err, request, response));
}

function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].lat;
  this.longitude = geoData[0].lon;
}

function weatherHandler(request, response) {
  // try {
  //   const weatherRes = require('./data/darksky.json');
  //   const weatherSummaries = weatherRes.data.map((day) => {
  //     return new Weather(day);
  //   });
  //   response.status(200).json(weatherSummaries);
  // } catch (error) {
  //   errorHandler(
  //     'So sorry, something went wrong with weather.',
  //     request,
  //     response
  //   );
  // }
  superagent(
    `https://api.weatherbit.io/v2.0/forecast/daily?city=${request.query.search_query}&key=${process.env.WEATHER_API_KEY}`
  )
    .then((weatherRes) => {
      console.log(weatherRes);
      const weatherSummaries = weatherRes.body.data.map((day) => {
        return new Weather(day);
      });
      response.status(200).json(weatherSummaries);
    })
    .catch((err) => errorHandler(err, request, response));
}

function Weather(day) {
  this.forecast = day.weather.description;
  this.time = new Date(day.valid_date).toString().slice(0, 15);
}
function trailsHandler(request, response) {
  const lat = request.query.latitude; const lon = request.query.longitude; getTrailData(lat, lon).then((trailData) => response.status(200).json(trailData)); }
function getTrailData(lat, lon) {
  const url = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=500&key=${process.env.TRAIL_API_KEY}`;
  return superagent.get(url).then((trailData) =>
  { let trailsSummaries = trailData.body.trails.map((val) => { return new Trails(val); });
    return trailsSummaries; }); }

function Trails(go) {
  this.name = go.name;
  this.location = go.location;
  this.length = go.length;
  this.stars = go.stars;
  this.starVotes = go.starVotes;
  this.summary = go.summary;
  this.trail_url = go.url;
  this.conditions = go.conditionDetails;
  this.condition_date = go.conditionDate.substring(0, 11);
  this.condition_time = go.conditionDate.substring(11);

}


app.get('/add', (req, res) => {
  locationHandler();
  weatherHandler();
  trailsHandler();
  let search_query = req.query.search_query;
  let formatted_query = req.query.formatted_query;
  let latitude = req.query.latitude;
  let longitude = req.query.longitude;
  const SQL = 'INSERT INTO locations(search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3.$4) RETURNING *';
  const safeValues = [req.query.search_query, req.query.formatted_query,req.query.latitude,req.query.longitude];
  client
    .query(SQL, safeValues)
    .then((results) => {
      res.status(200).json(results.rows);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});
app.get('/locations', (req, res) => {
  const SQL = 'SELECT * FROM locations;';
  client
    .query(SQL)
    .then((results) => {
      res.status(200).json(results.rows);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});


function notFoundHandler(request, response) {
  response.status(404).send('huh?');
}

function errorHandler(error, request, response) {
  response.status(500).send(error);
}

// Make sure the server is listening for requests
// app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
client
  .connect()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`my server is up and running on port ${PORT}`)
    );
  })
  .catch((err) => {
    throw new Error(`startup error ${err}`);
  });

