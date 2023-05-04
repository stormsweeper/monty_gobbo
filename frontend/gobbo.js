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

    const fails_morale = (mor) => die_roll(6) + die_roll(6) > mor;

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
        return Math.max(1, weapons[weapon].die + mod);
    };

    const fighter_dmg = () => {
        let roll = die_roll(20);
        if (roll === 1) return 0;
        // hard coded to lvl 1-3 hit chance
        if (roll < 20) {
            let hits = die_roll >= 10 + (9 - opponent.ac) - stat_mod(fighter.str);
            if (!hits) return 0;
        }
        return weapon_damage(fighter.weapon, stat_mod(fighter.str));
    };

    const opponent_hit_mod = () => {
        if (opponent["hit-dice"] <= 7) return opponent["hit-dice"];
        return 6 + Math.ceil((opponent["hit-dice"] - 6) / 2);
    }

    const opponent_dmg = () => {
        let roll = die_roll(20);
        if (roll === 1) return 0;
        if (roll < 20) {
            let hits = die_roll >= 10 + (9 - fighter.ac) - opponent_hit_mod();
            if (!hits) return 0;
        }
        return weapon_damage(opponent.weapon, 0);
    };

    const take_fighter_turn = (wave_stats, current_opp_hp, current_wave_size) => {
        // do fighter dmg
        let dmg = fighter_dmg();
        if (dmg > 0) {
            wave_stats.fighter_hits++;
            current_opp_hp -= fighter_dmg();
            // reduce wave size?
            if (current_opp_hp <= 0) {
                current_wave_size--;
                wave_stats.opponents_killed++;

                // if 1st down, check morale
                if (
                    current_wave_size === opponent["wave-size"] - 1
                    &&
                    fails_morale(opponent.morale)
                ) {
                    wave_stats.failed_morale_first++;
                    current_wave_size = 0;
                }
                // if half down, check morale
                else if (
                    current_wave_size === Math.floor(opponent["wave-size"] / 2)
                    &&
                    fails_morale(opponent.morale - 1)
                ) {
                    wave_stats.failed_morale_second++;
                    current_wave_size = 0;
                }
                // else, next opponent steps up
                else {
                    current_opp_hp = opponent.hp;
                }
            }
        }
    };

    const take_opponent_turn = (wave_stats, current_fighter_hp, current_wave_size) => {
        let total_opp_dmg = 0;
        let opp_dmg = 0;
        for (let o = 1; o <= current_wave_size; o++) {
            opp_dmg = opponent_dmg();
            if (opp_dmg > 0) {
                wave_stats.opponent_hits++;
                total_opp_dmg += opp_dmg;
            }
        }
        current_fighter_hp -= total_opp_dmg;
    }

    const trials = 10000;

    let total_stats = {
        fighter_deaths: 0,
        waves_faced: 0,
        combat_rounds: 0,
        opponents_killed: 0,
        fighter_hits: 0,
        opponent_hits: 0,
        failed_morale_first: 0,
        failed_morale_second: 0,
    };

    // the actual sim
    const monty_gobbo_time = () => {

        trial_loop: for (let current_trial = 1; current_trial <= trials; current_trial++) {

            let current_fighter_hp = fighter.hp;
            let waves_remaining = opponent["wave-count"];
            let trial_stats = {
                waves_faced: 0,
                combat_rounds: 0,
                opponents_killed: 0,
                fighter_hits: 0,
                opponent_hits: 0,
                failed_morale_first: 0,
                failed_morale_second: 0,
            };

            wave_loop: while (waves_remaining > 0) {
                // call up next wave
                trial_stats.waves_faced++;
                waves_remaining--;

                let wave_stats = {
                    combat_rounds: 0,
                    opponents_killed: 0,
                    fighter_hits: 0,
                    opponent_hits: 0,
                    failed_morale_first: 0,
                    failed_morale_second: 0,
                };

                let current_opp_hp = opponent.hp;
                let current_wave_size = opponent["wave-size"];
                let init = roll_init();
                while (current_wave_size > 0) {
                    wave_stats.combat_rounds++;
                    if (init === "fighter") {
                        take_fighter_turn(wave_stats, current_opp_hp, current_wave_size);
                        if (current_wave_size > 0) take_opponent_turn(wave_stats, current_fighter_hp, current_wave_size);
                    }
                    else if (init === "opponent") {
                        take_opponent_turn(wave_stats, current_fighter_hp, current_wave_size);
                        if (current_fighter_hp > 0) take_fighter_turn(wave_stats, current_opp_hp, current_wave_size);
                    }
                    else {
                        // results end up the same, but take_fighter_turn reduces current_wave_size
                        take_opponent_turn(wave_stats, current_fighter_hp, current_wave_size);
                        take_fighter_turn(wave_stats, current_opp_hp, current_wave_size);
                    }

                    if (current_wave_size < 1 || current_fighter_hp < 1) {
                        // update stats
                        for (let s in wave_stats) trial_stats[s] += wave_stats[s];

                        // if death, next trial
                        if (current_fighter_hp < 1) {
                            total_stats.fighter_deaths++;
                            break wave_loop;
                        }

                        // otherwise, next wave
                        continue wave_loop;
                    }
                }
            }

            // update total stats
            for (let s in trial_stats) total_stats[s] += trial_stats[s];

        };

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

        update_fighter();
        update_opponent();
        monty_gobbo_time();

        setTimeout(() => { el("start-button").disabled = false; }, 250);
    }
})();