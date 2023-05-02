(() => {
    const el = (id) => document.getElementById(id);
    const strval = (id) => el(id).value;
    const numval = (id) => parseInt(strval(id));

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


    el("gobbo-form").onchange = () => {
        // update fighter
        for (const s of ["str", "int", "wis", "dex", "con", "cha", "lvl", "hp"]) fighter[s] = numval(`rating-fighter-${s}`);

        for (const s of ["armor", "weapon", "name"]) fighter[s] = strval(`fighter-${s}`);

        fighter.ac = armors[fighter.armor] - stat_mod(fighter.dex);
        el("rating-fighter-ac").innerText = fighter.ac;
        console.log(fighter);
    }
})();