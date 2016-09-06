var PBT = require("../src/PropertyBased.js");

describe("Testing the propertyBasedTesting Methods",()=>{

	it("Should remove the n th index from the list", ()=>{
		var result = PBT.exclude_nth_index(2,[1,2,3,4]);
		expect(result).toEqual([1,2,4]);
	})

	it("Should give the list of combinations C(n,r)", ()=>{
		var result = PBT.remove_seq([1,2,3,4]);
		expect(result).toEqual([[2,3,4],[1,3,4],[1,2,4],[1,2,3]]);
	})
})