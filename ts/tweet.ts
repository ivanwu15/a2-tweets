class Tweet {
	private text:string;
	time:Date;

	constructor(tweet_text:string, tweet_time:string) {
        this.text = tweet_text;
		this.time = new Date(tweet_time);//, "ddd MMM D HH:mm:ss Z YYYY"
	}

	//returns either 'live_event', 'achievement', 'completed_event', or 'miscellaneous'
    get source():string {
        const t = this.text.toLowerCase();

        // Live event tweets, e.g., "Watch my run right now..." or "#RKLive"
        if (t.includes('#rklive') || (t.includes('watch my') && t.includes(' live'))) {
          return 'live_event';
        }

        // Achievements, goals, fitness alerts
        if (
         t.includes('achieved a new personal record') ||
         t.startsWith('i just set a goal') ||
         t.includes('#fitnessalerts')
        ) {
         return 'achievement';
        }

        // Completed or posted activities
        if (t.startsWith('just completed a') || t.startsWith('just posted a')) {
          return 'completed_event';
        }

        return 'miscellaneous';
    }

    //returns a boolean, whether the text includes any content written by the person tweeting.
    get written():boolean {
        if (this.source !== 'completed_event') return false;
    return this.text.indexOf(' - ') !== -1;
    }

    get writtenText(): string {
    if (!this.written) return '';
    const afterDash = this.text.split(' - ')[1] || '';
    // Strip URLs and trailing RunKeeper hashtag
    return afterDash.replace(/https?:\/\/\S+/g, '').replace(/#runkeeper/gi, '').trim();
    }

    get activityType():string {
        if (this.source != 'completed_event') return "unknown";
        const t = this.text.toLowerCase();
        if (t.includes('mtn bike')) return 'mtn bike';
        if (t.includes(' bike')) return 'bike';
        if (t.includes(' run')) return 'run';
        if (t.includes(' walk')) return 'walk';
        if (t.includes(' hike')) return 'hike';
        if (t.includes(' swim')) return 'swim';
        if (t.includes(' row')) return 'row';
        if (t.includes(' elliptical')) return 'elliptical';
        if (t.includes(' meditation')) return 'meditation';
        if (t.includes('freestyle')) return 'freestyle';
        if (t.includes(' circuit')) return 'circuit';
        return 'activity';
    }

    get distance():number {
        if(this.source != 'completed_event') return 0;
        const t = this.text.toLowerCase();
        const km = t.match(/([0-9]+(?:\.[0-9]+)?)\s?km\b/);
        if (km) return parseFloat(km[1]);
        const mi = t.match(/([0-9]+(?:\.[0-9]+)?)\s?mi\b/);
        if (mi) return parseFloat(mi[1]) * 1.60934;
        return 0;
    }

    getHTMLTableRow(rowNumber:number):string {
       const urlMatch = this.text.match(/https?:\/\/\S+/);
       const url = urlMatch ? urlMatch[0] : '#';
       const safeText = this.text
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;');
       return `<tr>
         <th scope="row">${rowNumber}</th>
         <td>${this.activityType}</td>
         <td><a href="${url}" target="_blank" rel="noopener">${safeText}</a></td>
       </tr>`;
    }
}