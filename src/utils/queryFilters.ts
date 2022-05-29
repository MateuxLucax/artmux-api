import { Knex } from "knex";

export type Filter = {
  name: string,
  operator: string,
  value: any
};

const operatorNameToSymbol = new Map();
[ ['equalTo', '='],
  ['different', '!='],
  ['lesser', '<'],
  ['lesserOrEqual', '<='],
  ['greater', '>'],
  ['greaterOrEqual', '>='] ]
.forEach(([k, v]) => operatorNameToSymbol.set(k, v));

// Read 'or' as a verb; a more verbose equivalent name would be 'combineFiltersWithOr'
function orFilters(query: Knex.QueryBuilder, filters: Filter[]) {
  for (const filter of filters) {
    const name = filter.name;
    const op   = filter.operator;
    const val  = filter.value;
    if (op == 'between') {
      query.orWhereBetween(name, val);
    } else if (op == 'contains' || op == 'startsWith' || op == 'endsWith') {
      let x = val;
      if (op == 'contains' || op == 'startsWith') x = x + '%';
      if (op == 'contains' || op == 'endsWith')   x = '%' + x;
      query.orWhereILike(name, x);
    } else if (operatorNameToSymbol.has(op)) {
      query.orWhere(name, operatorNameToSymbol.get(op), val);
    } else {
      throw `Unsupported filter.operator ${op}`;
    }
  }
}

export function addFilters(query: Knex.QueryBuilder, filters: Filter[]) {
  // Filters on the same field are combined with OR
  const byField = new Map();
  for (const filter of filters) {
    if (byField.has(filter.name)) {
      byField.get(filter.name).push(filter)
    } else {
      byField.set(filter.name, [filter]);
    }
  }
  for (const filters of byField.values()) {
    query.andWhere(function() { orFilters(this, filters) });
  }
}