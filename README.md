# Mission Control
The server portion of Barkley's internal TV network, Mission Control.


## API Routes
* `/api/events` - Retrieve all RocketU events. Query parameters which match object key and values will filter.
* `/api/gratitudes` - Retrieve all Gratitudes. Query parameters which match object key and values will filter. Add `startDate` and/or `endDate` query params in unix millisecond timestamp format to filter by date.
* `/api/users` - Retrieve all users. Query parameters which match object key and values will filter.
* `/api/anniversaries` - Retrieve all of today's anniversaries.
* `/api/birthdays` - Retrieve all of today's birthday's.
* `/api/mixed` - Retrieve information about events, gratitudes, anniversaries, and birthdays.


## Content Types

### RocketU
RocketU events are managed via google calendar. When events are added or changed, Mission Control will automatically re-sync with the google calendar service.

Calendar managers can use a special syntax to add extra properties to events. Anything surrounded in {} within the description field will undergo a special parsing method.

Any key value property can be added in this field, but only the following will have an effect:

* `max_attendees` : the max number of attendees who can rsvp to an event
* `rsvp_code` : a short code that can be used to text rsvp for an event


### Gratitudes
When e-mails are received by gratitudes@barkleyus.com, they will be noticed by the [context.io](https://context.io/) service and will call a corresponding web hook on Mission Control. If the e-mail passes a certain rule set, it will be added to the gratitude list. The rule set is as follows:

* Email body content must be under 140 characters
* Email must be sent to gratitudes@barkleyus.com
* If the body content contains the word "delete" and has a reference to another e-mail, the referenced gratitude will be deleted


### Users
Users are fetched from [google's admin sdk directory api](https://developers.google.com/admin-sdk/directory/).


### Birthdays
Birthdays are fetched from [junkdrawer](http://junkdrawer.barkleyus.com) and are stored within the user record as a detailed object. Each object contains a date along with month number and day number. Example -
    // user object
    {
      'name'      : 'joe',
      '...'       : '...'
      'birthday'  : {
        date  : javascript date object ('Aug 6, 1985')
        month : 7
        day   : 6
      }
    }


### Anniversaries
Anniversaries follow the same pattern as birthdays.



## Auth
Mission Control requires an access token in order to read the RocketU calendar. This single access token is used to make all following calendar requests. Before the app syncs with a calendar, a user with read permissions to the environment variable specified calendar must visit `/auth` and follow the flow.



## Setup
The following environment variables need to be set.
* `GOOGLE_ID` : An id for a google app, set one up at [console.developers.google.com](https://console.developers.google.com)
* `GOOGLE_SECRET` : The corresponding secret for the aforementioned google app
* `GOOGLE_CALENDAR_ID` : The calendar to use for RocketU content. Use the [google calendar list](https://developers.google.com/google-apps/calendar/v3/reference/calendarList/list) tool to find the id.
* `ROOT_URL` : The web hook root url to use for both the e-mail and calendar hooks.
* `DB_CONNECT` : A mongo connection string
* `MODE` : development or production
* `CONTEXTIO_KEY` : context.io key
* `CONTEXTIO_SECRET` : context.io secret
