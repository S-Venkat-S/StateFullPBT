var propertyBased = require("../../../../index.js");
var jsc = require("jsverify");
import todos from '../../reducers/todos';
import R from 'ramda';

const addCommand = {
    precondition: (state, command) => {
        return true
    },

    generate: (state, command) => {
        return jsc.generator.record({
            type: jsc.generator.constant('ADD_TODO'),
            id: jsc.nat(135).generator,
            text: jsc.asciinestring.generator
        });
    },

    exec: (state, cmd) => {
        return todos(state, cmd)
    },

    postcondition: (curren_state, cmd) => {
    		console.log("POST___")
        return true
    }
}


const toggleCommand = {
    precondition: (state, command) => {
        return state.length != 0
    },

    generate: (state, command) => {
        return jsc.generator.record({
            type: jsc.generator.constant('TOGGLE_TODO'),
            id: jsc.suchthat(jsc.nat(135), (a) => {
                var filteredItems = R.filter((item) => {
                    return item.id == a
                }, state)
                return filteredItems.length != 0;
            }).generator
        });
    },

    exec: (state, cmd) => {
        return todos(state, cmd)
    },

    postcondition: (curren_state, cmd) => {
        console.log("POST___")
        var filteredState = curren_state.filter((item, index, array) => {
            if (item.id == cmd.id) {
                return true
            }
            return false;
        });

        return filteredState.length != 0;
    }
}

//***************************************************************************************************************
//PROPERTY DEFINITIONS

describe("Testing states ", function() {
    it("sample Invariant", function() {


        //with shrinking
        var samArb = {
            generator: propertyBased.cmd_seq([], { ADD_TODO: addCommand, TOGGLE_TODO: toggleCommand }),
            shrink: jsc.shrink.bless(propertyBased.shrinkOp([], { ADD_TODO: addCommand, TOGGLE_TODO: toggleCommand })),
            show: jsc.show.def
        }

        //without shrinking

        // var samArb = {
        //     generator: cmd_seq([],{ADD_TODO: addCommand, TOGGLE_TODO: toggleCommand}),
        //     shrink: jsc.shrink.noop,
        //     show: jsc.show.def
        // }

        var property = jsc.forall(samArb, function(ls) {
                var res = ls.filter((item, index, array) => {
                    if (item[0].type == 'TOGGLE_TODO') {
                        let id = item[0].id;
                        let currentState = item[1]
                        let currentAddstate = currentState.find((item => {
                            return (item.id == id)
                        }))
                        let prev = array[index - 1];
                        let prevState = prev[1];
                        let previousAddstate = prevState.find((item) => {
                            return (item.id == id)
                        })
                        return previousAddstate.completed == currentAddstate.completed
                    }
                    else if (item[0].type == 'ADD_TODO') {
                    	let id = item[0].id;
                    	let currentState = item[1];
                    	let currentAddstate = currentState.find((item => {
                            if (item.id == id) {
                            	return item.completed == true;
                            }
                      }))
                    }
                    return false;
                })
                return res.length == 0;
            })
            //jsc.assert(property);
        jsc.assert(property, { rngState: '8f2513a7d69fe08b4c' });

    })
})
