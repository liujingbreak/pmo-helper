## Functions in this package
Function 1. Turn off wifi on specific time.


Function 2. Run special scripts on a CronJob schedule

## Cron Expression
A Cron Expression that EasyCron supports is a string comprising five fields separated by white space. Fields can contain any of the allowed values, along with various combinations of the allowed special characters for that field. The fields are as follows:

| Field Name |	Mandatory |	Allowed Values | Allowed Special Characters
| -|-|-|-
| Minutes	| YES|	0 - 59	| , - * /
| Hours	|YES|	0 - 23	| , - * /
| Day of month|	YES|	1 - 31	| , - * ? / L W
| Month|	YES|	1 - 12 (representing Jan - Dec), JAN - DEC (case-insensitive), JANUARY - DECEMBER (case-insensitive)	|, - * /
| Day of week|	YES	|0 - 6, 7 (representing Sun - Sat and Sun again) SUN -  SAT (case-insensitive), SUNDAY - SATURDAY (case-insensitive)|	, - * ? / L #
| Year|	NO|	empty or 1970-2099	|, - * /

### Special characters
#### Asterisk ( * )
The asterisk indicates that the cron expression matches for all values of the field. E.g., using an asterisk in the 1th field (minute) indicates every minute. * is a non-restricted character.
#### Slash ( / )
Slashes describe increments of ranges. For example 3-59/15 in the 1st field (minutes) indicate the third minute of the hour and every 15 minutes thereafter. The form "*/..." is equivalent to the form "first-last/...", that is, an increment over the largest possible range of the field.
#### Comma ( , )
Commas are used to separate items of a list. For example, using "1,2,5" in the 5th field (day of week) means Mondays, Wednesdays and Fridays.
#### Hyphen ( - )
Hyphens define ranges. For example, 2000-2010 indicates every year between 2000 and 2010 AD, inclusive.
#### L
'L' stands for "last". When used in the day-of-week field, it allows you to specify constructs such as "the last Friday" ("5L") of a given month. In the day-of-month field, it specifies the last day of the month.
#### W
The 'W' character is allowed for the day-of-month field. This character is used to specify the weekday (Monday-Friday) nearest the given day. As an example, if you were to specify "15W" as the value for the day-of-month field, the meaning is: "the nearest weekday to the 15th of the month." So, if the 15th is a Saturday, the trigger fires on Friday the 14th. If the 15th is a Sunday, the trigger fires on Monday the 16th. If the 15th is a Tuesday, then it fires on Tuesday the 15th. However if you specify "1W" as the value for day- of-month, and the 1st is a Saturday, the trigger fires on Monday the 3rd, as it does not 'jump' over the boundary of a month's days. The 'W' character can be specified only when the day-of-month is a single day, not a range or list of days.
#### Hash ( # )
'#' is allowed for the day-of-week field, and must be followed by a number between one and five. For example, 5#2 indicates "the second Friday" of a given month.
#### Question mark ( ? )
It is used instead of '*' for leaving either day-of-month or day-of-week blank. '?' is a non-restricted character. In practice, the effect of '?' is same as '*'.

### Quick Cron Expression Examples
| Cron | Expression	Meaning
|-|-
| * * * * * 2020	| Execute a cron job every minute during the year 2020
| * * * * *| 	Execute a cron job every minute
| */5 * * * *	| Execute a cron job every 5 minutes
| 0 * * * *| 	Execute a cron job every hour
| 0 12 * * *	| Fire at 12:00 PM (noon) every day
| 15 10 * * *	| Fire at 10:15 AM every day
| 15 10 * * ?	| Fire at 10:15 AM every day
| 15 10 * * * 2020-2022	| Fire at 10:15 AM every day during the years 2020, 2021 and 2022
| * 14 * * *	| Fire every minute starting at 2:00 PM and ending at 2:59 PM, every day
| 0/5 14,18 * * *	| Fire every 5 minutes starting at 2:00 PM and ending at 2:55 PM, AND fire every 5 minutes starting at 6:00 PM and ending at 6:55 PM, | every day
| 0-5 14 * * *	| Fire every minute starting at 2:00 PM and ending at 2:05 PM, every day
| 10,44 14 * 3 3	| Fire at 2:10 PM and at 2:44 PM every Wednesday in the month of March.
| 15 10 * * 1-5| 	Fire at 10:15 AM every Monday, Tuesday, Wednesday, Thursday and Friday
| 15 10 15 * *| 	Fire at 10:15 AM on the 15th day of every month
| 15 10 L * *	| Fire at 10:15 AM on the last day of every month
| 15 10 * * 5L	| Fire at 10:15 AM on the last Friday of every month
| 15 10 * * 5#3	| Fire at 10:15 AM on the third Friday of every month
| 0 12 1/5 * *	| Fire at 12:00 PM (noon) every 5 days every month, starting on the first day of the month.
| 11 11 11 11 *| 	Fire every November 11th at 11:11 AM.
| 11 11 11 11 * 2020| 	Fire at 11:11 AM on November 11th in the year 2020.
| 0 0 * * 3	|Fire at midnight of each Wednesday.
| 0 0 1,2 * *	|Fire at midnight of 1st, 2nd day of each month
| 0 0 1,2 * 3	|Fire at midnight of 1st, 2nd day of each month, and each Wednesday.
