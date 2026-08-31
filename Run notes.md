Pilot: Keeps the session on track  
    - Used to keep runpath intact at all times
    - Assigns agents assignments, updates chat with progress at checkpoints
    - Writes final review and calls the closer

Recon
Scope/Spec
Builder
Redpen
Troubleshoot



Run path: Agents cannot stop moving without someone else in the loop, so their always needs to be a "batton" being bassed in the run.  Each little spot will end up being a mini loop where the path leaves.  

Phase
Stage
Task
Agent






- So far sonnet is taking a shit on the session
- opus started reading everything (they all did that)
     - it was in the brief that I didn't write
     - I've gotta write them myself, the agents create the template (even though I think they alread did)
-recon almost failed a test because user was neede
    - prepare for tasks taht will have failure and what the gameplan is for if it fails
 - One of the agents left and did what it wan't suppposed to, Im' putting everything in the review
- The plan was have the closer come through and when it was done, for this agent to message another in a fresh session with the brief and continue the run (my version of a refresh)
- Found errors in the specs
- P0 COST $11, SESION AENT AT 120K ISH



- p1 Session agent used a shit ton of context and I don't know why, ended up costing me $5 200k
- I kept forgetting to tell the agents to use the goto agent default
- This phase ran a lot smoother it seemed, was more expensive but it has more bulding involved (I wonder if there's a way to estimate the amount of tokens a job might take bwahah)
- Sonnet has trouble as the flow runner keeping things together
    - I don't know how reliable it's receipts are, adn tha'ts somehtign ot consider with the runner
- The agents are not refreshing or tapping outt in VS Code and it's getting expensive, 
- Second run ran about $58 and 2hrs.  I'll bet about 30% of that was bloated agents doing work they shouldn't have


- I ended up goiing cheap on one subagent with sonnet and expensive on another as opus and I'm curious to see how it'll pan out.  I think each wave will cost about the same as last time.  Chose sonnet to drive and said hard enforce rule on the tapout procedure.
- After P2, I'm thinking of running one in the ADE to see how that works out
    - Git commit first so it can be undone
- This session ran a good $5 more than it needed to from an Opus agent that didn't tap out when it should have
- There was a point where it ran a 5min test and tokens started draaaaaining. An extra $1.70 worth of usage
    - **TIMED TESTS WILL REQUIRE AN AGENT TO DO A CHRON JOB OR WRITE IN FOR A COMPLETION NOTICE ON ALL TIMED TESTS**
    - **THIS COULD HAVE BEEN A BIG MONEY SINK IN EARLIER PHASES**
    - Pulled teh agent out early over teh 5min test to see how seamless the process is
        **RUN SMALLER TESTS IN THE ADE BASED OFF STEPS FROM THIS PLAN**
    - session agent accidentally spawned the new agent too soon
    - the former agent was pretty much waiting on a test so it was kind of a $1 wash on that one too
        - Simple: subagents can block-and-wait instead of poll — they set up a background watcher that only wakes them when the thing they're waiting on actually finishes, instead of repeatedly checking a file.
            - One step up: the mechanism is Bash with run_in_background for the long-running test itself, plus a Monitor-tool until-loop (e.g. until grep -q PASS logfile; do sleep 2; done) that blocks and only returns when the condition hits — one wakeup, not N checks. That's exactly what fix-clock's replacement did on its own after I told it "no polling": armed one background loop, went idle, got notified when the log line landed.
- 3hrs in and the session agent was 180k
    - Make the tapout rule 175k?  maybe create a tool to help figuure out the actual cost difference and find the ideal number range: what sholud the average $/token be and where is THAT limit?
- The session agent kept checking in with me which I think is probably good
    - I think the loop is for repeatable patterns only... anything new is something I need to stick around for.  Either that, or it comes with experience and quality run plans to get aroudn those things
- Redpens are expensive... they need to start out bloated AF and many times need to know what what going on
    - see if there's a more efficient way to spend the tokens with redpens 
- Overall, the run cost $80, 225k tokens on the session agent, and lasted for 3 and a half hours.  
**Lessons learned**
- Enforce the tapout rules at 175k
- Make sure agents are not in a loop checking a 5min test


- I did a seam session with a sonnet, but it wasn't quite specific enough (sonnet seems like the MoE of Opus at this point) so I finished with an Opus session
- These are things that would have had to been changed later, and I wonder if it's more efficient to think through them now and not undersatnd them or see them wrong and fix them after the fact.  
- had some mechanical changes to make that I didn't dbl check (I ran closers on every session which is why I was careless)

- Sonnet dispatch, had to finish a few updates 
    - I neglected again to ask for goto with model override, not mad though
- I decided to address open decisions early... the same shit keeps popping up
    - fixed do vs movable do, enharmonics
- I'm noticing it's SO much easier to answer questions on runs when I'm 100% confident in the content (the music decisions are second nature, the code decisions not so much, and the research decisions are easy to understand just difficult to find the core principles to solve)
- The theory tool took a lot , the spec got hung up on it the hardest, the two issues being listed above
- Split P3 into two session, first one was $28 and session agent was at around 175k. It was a heavy session
- Split into 3 session, 245k on session agent and $45 for the run
- The third P3 session was another $22 with big blockers.  Again, the theory and enharmonics are what throwing the agents through the loops

**This is the place that the first stop should be**
- I have the 4 UIs complete
    - I don't love them, but there's stuff in them that I wans't expecting that's good
        - YOu can tell what Claude is weighted to program and what not to
    - Some of them need a lot of mechanical work and I need to sit down and take notes
        - I think I'm actually going ot hit pause on the project after tonight and spend time with them IRL
        - Not only can I fix the issues by looking at them, I can reskin the app to look the way I want it to and put in other features I wasn't thinking of
        - In terms of the design process, this was actually 100% the logical spot to stop and look and make edits in terms of the run.  It's the first time you can "use" the product... that's where the human in the loop comes in