'use strict';
var R = require('ramda');
var lazyseq = require('lazy-seq');
var jsc = require('jsverify');


//console.log(Agents);

//*******************PROTOCOL******************************************
//precondition :: a->b->bool
const precondition = R.curry((state, command) => {
    return command.precondition(state)
})

//generate :: a->b->Gen
const generate = R.curry((state, command) => {
    return command.generate(state)
})

//exec :: b->a->c->a
const exec = R.curry((command, state, cmd) => {
    return command.exec(state, cmd)
})

const postcondition = R.curry((command, curren_state, cmd) => {
    return command.postcondition(curren_state, cmd)
})




// cmd_seq_helper ::  b->[string]->int->Gen
const cmd_seq_helper = (state, commands, size) => {
    let oneOf = jsc.generator.oneof;
    let validCommands = R.compose(R.map(generate(state)),
        R.filter(precondition(state)),
        R.values);

    var s = jsc.generator.combine(oneOf(validCommands(commands)),
        (cmd) => {
            if (size == 0) {
                let currentState = exec(commands[cmd['type']], state, cmd)
                return jsc.generator.constant([
                    [cmd, currentState]
                ]);
            } else {
                let currentState = exec(commands[cmd['type']], state, cmd);
                var gen = cmd_seq_helper(currentState,
                    commands,
                    --size);
                return gen.flatmap((a) => {
                    return jsc.generator.constant(R.concat([
                        [cmd, currentState]
                    ])(a));
                });
            }

        });
    return s;
}


//cmd_seq :: state->[a]-Gen
const cmd_seq = (state, commands) => {
    return jsc.generator.combine(jsc.number(0, 5).generator, (num) => {
        return cmd_seq_helper(state, commands, Math.round(num))
    })
}


//valid_sequence :: [a]->[b]->[a]-[int]->bool
const valid_sequence = R.curry((commands, state_seq, cmd_seq, initialState, sub_sq_indx) => {
    let flag = true;
    let result = R.reduce((curren_state, state_idx) => {
        let cmd = cmd_seq[state_idx];
        let command = commands[cmd['type']];
        if (postcondition(command, curren_state, cmd)) {
            // console.log('PASSED ',' COMMAND');
            return exec(command, curren_state, cmd);
        } else {
            flag = false;
            return curren_state;
        }
    }, initialState, sub_sq_indx);
    if (flag) {
        // if (!R.isEmpty(result)) {
        //     return false;
        // }
        return true;
    } else {
        return false;
    }
});

const reduce = R.curry((shrink_subseq, shrink, length, a) => {
    var res = R.map((c) => {
        shrink = shrink_subseq(c, shrink, length);
        return c;
    }, a);
    return shrink;

})

//shrink_sequence :: [a]->[b]->{c}->[a]
const shrink_sequence = (cmd_seq, state_seq, commands, initialState) => {
    var tempState = initialState;
    let validCommands = R.compose((a) => {
        return a }, R.map((cmd) => {
        var state = exec(commands[cmd['type']], tempState, cmd);
        tempState = state;
        return [cmd, state];
    }));
    // R.filter((cmd)=>{
    //  return precondition(tempState,commands[cmd['type']])}));


    //shrink_subseq :: [int]->[commands]->int->[commands]
    const shrink_subseq = (s, shrink, length) => {
        tempState = initialState;
        if (!R.isEmpty(s)) {
            let shrink_seq = R.compose(
                (a) => {
                    return a },
                validCommands,
                R.map((index) => {
                    return cmd_seq[index] }))(s)
            if (s.length != length) {
                shrink = R.insert(0, shrink_seq, shrink);
            }

            //recursion
            shrink = R.compose(
                reduce(shrink_subseq, shrink, length),
                R.filter(valid_sequence(commands, state_seq, cmd_seq, initialState)), (a) => {
                    return a },
                remove_seq)(s);

            return shrink

        } else {
            return shrink;
        }

    }

    var shrink = shrink_subseq(R.range(0, cmd_seq.length), [], cmd_seq.length)
    return shrink;
}


//remove_seq :: [a]->[a]
const remove_seq = (s) => {
    var s1 = s; // TODO : Is this line really needed.
    var seq = s.map((current_value, index) => {
        let seq = lazyseq.fromArray(s1); // TODO : Is this line really needed.
        return exclude_nth_index(index, s);
    })
    return seq;
}


//shrinkOp :: a->{b}->[c]->[c]
const shrinkOp = R.curry((initialState, commands, cmd_seq) => {
    if (cmd_seq[0] != undefined && cmd_seq[0][0] != undefined && cmd_seq[0][0]['type'] != undefined) {
        return shrink_sequence(R.map((item) => item[0], cmd_seq),
            R.map((item) => item[1], cmd_seq),
            commands, initialState);
    } else {
        return [];
    }

});

//exclude_nth_index :: int->[int]->[int]
const exclude_nth_index = (n, s) => {
    if (n == 0) {
        return R.drop(1, s);
    } else {
        var value = exclude_nth_index((--n), R.drop(1, s));
        return R.concat([s[0]], value);
    }
}

if (process.env.NODE_ENV === "test") {
    module.exports = {
        cmd_seq: cmd_seq,
        shrinkOp: shrinkOp,
        exclude_nth_index: exclude_nth_index,
        remove_seq: remove_seq
    }
}
else {
    module.exports = {
        cmd_seq: cmd_seq,
        shrinkOp: shrinkOp,
    }
}
