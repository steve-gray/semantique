// NPM Dependencies
const chai = require('chai');

// Internal Dependencies
const rules = require('../lib/rules');

// Globals
const expect = chai.expect;

describe('Rules', () => {
  describe('classifyChange', () => {
    it('Should classify a change as expected (singular match)', () => {
      expect(rules.classifyChange('foo(bits): Text here', {
        types: [
          {
            "type": "patch",
            "prefix": "foo",
            "priority": 1,
          },
          {
            "type": "minor",
            "prefix": "bar",
            "priority": 2,
          },
        ],
      })).to.deep.eql({
        "type": "patch",
        "prefix": "foo",
        "priority": 1,
      });
    });

    it('Should classify a change as expected (Array item match)', () => {
      expect(rules.classifyChange('fizz(bits): Text here', {
        types: [
          {
            "type": "patch",
            "prefix": ["foo", "fizz", "buzz"],
            "priority": 1,
          },
          {
            "type": "minor",
            "prefix": "bar",
            "priority": 2,
          },
        ],
      })).to.deep.eql({
        "type": "patch",
        "prefix": ["foo", "fizz", "buzz"],
        "priority": 1,
      });
    });

    it('Should classify a change as expected (priority conflict match)', () => {
      expect(rules.classifyChange('foo(bits): Text here', {
        types: [
          {
            "type": "patch",
            "prefix": "foo",
            "priority": 1,
          },
          {
            "type": "minor",
            "prefix": "foo",
            "priority": 2,
          },
        ],
      })).to.deep.eql({
        "type": "minor",
        "prefix": "foo",
        "priority": 2,
      });
    });


    it('Should classify a change as default (no match)', () => {
      expect(rules.classifyChange('foo(bits): Text here', {
        defaultType: {
          "type": "patch",
          "prefix": "foo",
          "priority": 1,
        },
        types: [
          {
            "type": "minor",
            "prefix": "bar",
            "priority": 2,
          },
        ],
      })).to.deep.eql({
        "type": "patch",
        "prefix": "foo",
        "priority": 1,
      });
    });    
  });
});
