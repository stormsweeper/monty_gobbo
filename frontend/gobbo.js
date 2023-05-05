(() => {
    const el = (id) => document.getElementById(id);
    const strval = (id) => el(id).value;
    const numval = (id) => parseInt(strval(id));

    // random int between 1 and max (inclusive)
    // Math.random is >= 0, but always < 1, so this is needed
    const die_roll = (max) => Math.floor(Math.random() * max) + 1;

    const stat_mod = (rating) => {
        switch (rating) {
            case 3: return -3;
            case 4: case 5: return -2;
            case 6: case 7: case 8: return -1;
            case 13: case 14: case 15: return 1;
            case 16: case 17: return 2;
            case 18: return 3;
        }
        return 0;
    };

    const armors = {
        "clothing": 9,
        "clothing-and-shield": 8,
        "leather": 7,
        "leather-and-shield": 6,
        "chain": 5,
        "chain-and-shield": 4,
        "plate": 3,
        "plate-and-shield": 2,
    };

    const weapons = {
        "torch": { die: 4, twohanded: false },
        "dagger": { die: 4, twohanded: false },
        "club": { die: 4, twohanded: false },
        "hand-axe": { die: 6, twohanded: false },
        "mace": { die: 6, twohanded: false },
        "short-sword": { die: 6, twohanded: false },
        "spear": { die: 6, twohanded: false },
        "war-hammer": { die: 6, twohanded: false },
        "battle-axe": { die: 8, twohanded: true },
        "sword": { die: 8, twohanded: false },
        "pole-arm": { die: 10, twohanded: true },
        "two-handed-sword": { die: 8, twohanded: true },
    };

    const fighter = {
        str: 12,
        int: 12,
        wis: 12,
        dex: 12,
        con: 12,
        cha: 12,
        lvl: 1,
        hp: 8,
        ac: 2,
        armor: "plate-and-shield",
        weapon: "sword",
        name: "",
    };

    const opponent = {
        "wave-size": 5,
        "wave-count": 20,
        "hit-dice": 0,
        hp: 3,
        ac: 6,
        morale: 7,
        "weapon": "spear",
    };

    const update_fighter = () => {
        for (const s of ["str", "int", "wis", "dex", "con", "cha", "lvl", "hp"]) fighter[s] = numval(`rating-fighter-${s}`);

        for (const s of ["armor", "weapon", "name"]) fighter[s] = strval(`fighter-${s}`);

        fighter.ac = armors[fighter.armor] - stat_mod(fighter.dex);
        if (fighter.ac > 9) fighter.ac = 9;

        el("rating-fighter-ac").innerText = fighter.ac;
        console.log(fighter);
    }

    const update_opponent = () => {
        for (const s of ["wave-size", "wave-count", "hit-dice", "hp", "ac", "morale"]) opponent[s] = numval(`opp-${s}`);
        for (const s of ["weapon"]) opponent[s] = strval(`opp-${s}`);
        console.log(opponent);
    }

    const fails_morale = (mor) => {
        let roll = die_roll(6) + die_roll(6);
        console.log(`opponents rolled ${roll} vs their morale of ${mor}`);
        return roll > mor;
    };

    const roll_init = () => {
        let ftr = die_roll(6);
        let opp = die_roll(6);
        let result = "tied";
        if (ftr > opp) result = "fighter";
        if (opp > ftr) result = "opponent";
        if (weapons[fighter.weapon].twohanded && !weapons[opponent.weapon].twohanded) result = "opponent";
        if (weapons[opponent.weapon].twohanded && !weapons[fighter.weapon].twohanded) result = "fighter";
        return result;
    }

    const weapon_damage = (weapon, mod) => {
        return Math.max(1, die_roll(weapons[weapon].die) + mod);
    };

    const fighter_dmg = () => {
        let roll = die_roll(20);
        console.log(`fighter rolled ${roll} to hit`);
        if (roll === 1) {
            console.log("fighter missed (rolled a 1)");
            return 0;
        }
        // hard coded to lvl 1-3 hit chance
        if (roll < 20) {
            let target = 10 + (9 - opponent.ac) - stat_mod(fighter.str);
            console.log(`fighter needs >= ${target}`);
            if (roll < target) {
                console.log("fighter missed (rolled too low)");
                return 0;
            }
        }
        console.log("fighter hits");
        return weapon_damage(fighter.weapon, stat_mod(fighter.str));
    };

    const opponent_hit_mod = () => {
        if (opponent["hit-dice"] <= 7) return opponent["hit-dice"];
        return 6 + Math.ceil((opponent["hit-dice"] - 6) / 2);
    }

    const opponent_dmg = () => {
        let roll = die_roll(20);
        console.log(`opponent rolled ${roll} to hit`);
        if (roll === 1) {
            console.log("opponent missed (rolled a 1)");
            return 0;
        }
        // hard coded to lvl 1-3 hit chance
        if (roll < 20) {
            let target = 10 + (9 - fighter.ac) - opponent_hit_mod();
            target = Math.max(2, target);
            console.log(`opponent needs >= ${target}`);
            if (roll < target) {
                console.log("opponent missed (rolled too low)");
                return 0;
            }
        }
        console.log("opponent hits");
        return weapon_damage(fighter.weapon, stat_mod(fighter.str));
    };

    const take_fighter_turn = (wave_stats, wave_vars, trial_vars) => {
        // do fighter dmg
        let dmg = fighter_dmg();
        console.log(`fighter did ${dmg} damage`);
        if (dmg > 0) {
            wave_stats.fighter_hits++;
            wave_stats.fighter_dmg += dmg;
            wave_vars.current_opp_hp -= dmg;
            // reduce wave size?
            if (wave_vars.current_opp_hp <= 0) {
                console.log("fighter kills an opponent");
                wave_vars.current_wave_size--;
                wave_stats.opponents_killed++;

                // if 1st down, check morale
                if (wave_vars.current_wave_size === opponent["wave-size"] - 1) {
                    if (fails_morale(opponent.morale)) {
                        console.log("opponents failed first morale check");
                        wave_stats.failed_morale_first++;
                        wave_vars.current_wave_size = 0;
                    } else {
                        console.log("opponents passed first morale check");
                    }
                }
                // if half down, check morale
                else if (wave_vars.current_wave_size === Math.floor(opponent["wave-size"] / 2)) {
                    if (fails_morale(opponent.morale - 1)) {
                        console.log("opponents failed second morale check");
                        wave_stats.failed_morale_second++;
                        wave_vars.current_wave_size = 0;
                    } else {
                        console.log("opponents passed second morale check");
                    }
                }
                // else, next opponent steps up
                else if (wave_vars.current_wave_size > 0) {
                    console.log("next opponent steps forward");
                    wave_vars.current_opp_hp = opponent.hp;
                }
            }
        }
    };

    const take_opponent_turn = (wave_stats, wave_vars, trial_vars) => {
        let total_opp_dmg = 0;
        let opp_dmg = 0;
        for (let o = 1; o <= wave_vars.current_wave_size; o++) {
            opp_dmg = opponent_dmg();
            if (opp_dmg > 0) {
                console.log(`opponent did ${opp_dmg} damage`);
                wave_stats.opponent_hits++;
                total_opp_dmg += opp_dmg;
            }
        }
        console.log(`opponents did ${total_opp_dmg} damage total`);
        wave_stats.opponent_dmg += total_opp_dmg;
        trial_vars.current_fighter_hp -= total_opp_dmg;
    };

    const display_results = (stats) => {
        console.log(stats);
        const spct = (stats.trials - stats.fighter_deaths) / stats.trials * 100;
        const fmt = Intl.NumberFormat();
        el("survivability-desc").innerText = `In ${fmt.format(stats.trials)} trials, our fighter died ${fmt.format(stats.fighter_deaths)} times, for a survival rate of ${fmt.format(spct.toFixed(2))}%`;
    };


    // the actual sim
    const monty_gobbo_time = () => {
        console.log("starting sim");
        const trials = numval("opp-trial-count");

        let total_stats = {
            trials: trials,
            fighter_deaths: 0,
            waves_faced: 0,
            combat_rounds: 0,
            opponents_killed: 0,
            fighter_hits: 0,
            fighter_dmg: 0,
            opponent_hits: 0,
            opponent_dmg: 0,
            failed_morale_first: 0,
            failed_morale_second: 0,
        };

        trial_loop: for (let current_trial = 1; current_trial <= trials; current_trial++) {

            console.log(`starting trial # ${current_trial}`);

            let trial_stats = {
                waves_faced: 0,
                combat_rounds: 0,
                opponents_killed: 0,
                fighter_hits: 0,
                fighter_dmg: 0,
                opponent_hits: 0,
                opponent_dmg: 0,
                failed_morale_first: 0,
                failed_morale_second: 0,
            };

            let trial_vars = {
                current_fighter_hp: fighter.hp,
                waves_remaining: opponent["wave-count"],
            };

            wave_loop: while (trial_vars.waves_remaining > 0) {
                // call up next wave
                trial_stats.waves_faced++;
                trial_vars.waves_remaining--;
                console.log(`wave ${trial_stats.waves_faced} starting`);

                let wave_stats = {
                    combat_rounds: 0,
                    opponents_killed: 0,
                    fighter_hits: 0,
                    fighter_dmg: 0,
                    opponent_hits: 0,
                    opponent_dmg: 0,
                    failed_morale_first: 0,
                    failed_morale_second: 0,
                };
                let wave_vars = {
                    current_opp_hp: opponent.hp,
                    current_wave_size: opponent["wave-size"],
                };

                const init = roll_init();
                console.log(`init result: ${init}`);
                while (wave_vars.current_wave_size > 0) {
                    wave_stats.combat_rounds++;
                    console.log(`starting round ${wave_stats.combat_rounds} `);
                    if (init === "fighter") {
                        console.log("fighter attacks first");
                        take_fighter_turn(wave_stats, wave_vars, trial_vars);
                        if (wave_vars.current_wave_size > 0) take_opponent_turn(wave_stats, wave_vars, trial_vars);
                    }
                    else if (init === "opponent") {
                        console.log("opponents attack first");
                        take_opponent_turn(wave_stats, wave_vars, trial_vars);
                        if (trial_vars.current_fighter_hp > 0) take_fighter_turn(wave_stats, wave_vars, trial_vars);
                    }
                    else {
                        console.log("simultaneous attacks");
                        // results end up the same, but take_fighter_turn reduces current_wave_size
                        take_opponent_turn(wave_stats, wave_vars, trial_vars);
                        take_fighter_turn(wave_stats, wave_vars, trial_vars);
                    }

                    // if fighter dead, next trial
                    if (trial_vars.current_fighter_hp < 1) {
                        console.log("fighter died");
                        // update stats
                        for (let s in wave_stats) trial_stats[s] += wave_stats[s];
                        total_stats.fighter_deaths++;
                        break wave_loop;
                    }

                    // if opponents dead, next wave
                    if (wave_vars.current_wave_size < 1) {
                        console.log("opponents gone");
                        // update stats
                        for (let s in wave_stats) trial_stats[s] += wave_stats[s];
                        // otherwise, next wave
                        continue wave_loop;
                    }

                }
            }

            // update total stats
            for (const s in trial_stats) total_stats[s] += trial_stats[s];

        };

        // display stats
        display_results(total_stats);
    };

    // set up listeners and other one-time stuff

    el("gobbo-form").onchange = () => {
        update_fighter();
        update_opponent();
    }

    el("start-button").onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        el("start-button").disabled = true;
        el("survivability-desc").innerText = "";

        update_fighter();
        update_opponent();
        monty_gobbo_time();

        el("start-button").disabled = false;
    }
})();