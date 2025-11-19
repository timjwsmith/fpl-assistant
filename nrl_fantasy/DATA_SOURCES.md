# NRL Fantasy Edge - Data Sources

## Match Statistics

### 1. beauhobba/NRL-Data (GitHub)
- **URL**: https://github.com/beauhobba/NRL-Data
- **Format**: JSON/CSV
- **Coverage**: Recent seasons
- **Data**: Player stats (tries, tackles, metres), match results
- **Access**: Free, can download from `/data/` folder
- **Update Frequency**: Weekly during season

### 2. uselessnrlstats (GitHub)
- **URL**: https://github.com/uselessnrlstats/uselessnrlstats
- **Format**: 11 clean CSV files
- **Coverage**: 1908-present (complete historical data)
- **Data**: Match results, player stats per match, ladder standings
- **Access**: Free
- **Best for**: Historical analysis

### 3. nrlR Package (R)
- **URL**: https://github.com/DanielTomaro13/nrlR
- **Format**: R tibbles
- **Coverage**: 1998-present
- **Data**: Player stats, team stats, fixtures, ladder, head-to-head
- **Sources**: Rugby League Project, Champion Data, NRL.com
- **Access**: Free R package

## Fantasy Data

### 1. FootyStatistics.com
- **URL**: https://footystatistics.com/
- **Coverage**: 2018-present
- **Data**: Player fantasy scores, prices, break-evens, ownership
- **Access**: Free
- **Best for**: MVP prototyping

### 2. Unofficial NRL Fantasy JSON Endpoints
- **Source**: fantasy.nrl.com
- **Method**: Browser network inspection
- **Coverage**: Current season + 2018+
- **Data**: Player scores, prices, price changes, ownership
- **Access**: Unofficial, may change without notice
- **Note**: Use for prototyping only

### 3. Rugby League Fantasy Pro
- **URL**: https://app.rugbyleaguefantasypro.com/
- **Coverage**: Current season
- **Data**: Advanced stats, breakeven predictions, price forecasts
- **Access**: Paid subscription
- **Best for**: Production app

### 4. NRL Data API (Zyla)
- **URL**: https://zylalabs.com/api-marketplace/sports/nrl+data+api/4535
- **Coverage**: 2000-present
- **Data**: Match stats, player performance, fantasy stats
- **Access**: Commercial API (subscription)
- **Best for**: Production with comprehensive data needs

## MVP Strategy

For the MVP, we will:

1. **Phase 1** (Current): Use sample/mock data to build core functionality
2. **Phase 2**: Integrate with beauhobba/NRL-Data (GitHub) for match stats
3. **Phase 3**: Add FootyStatistics.com scraping for fantasy prices
4. **Phase 4** (Production): Evaluate paid APIs for stability

## Data Compliance

- All data sources used must comply with their respective Terms of Service
- For production, consider official NRL Fantasy partnership or licensed data providers
- Community tools like FootyStatistics are community-provided and best for research/personal use
