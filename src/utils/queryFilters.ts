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
    if (filter.operator == 'between') {
      query.orWhereBetween(filter.name, filter.value);
    } else if (filter.operator == 'contains' || filter.operator == 'startsWith' || filter.operator == 'endsWith') {
      let value = filter.value;
      if (filter.operator == 'contains' || filter.operator == 'startsWith') {
        value = value + '%';
      }
      if (filter.operator == 'contains' || filter.operator == 'endsWith') {
        value = '%'+ value;
      }
      query.orWhereILike(filter.name, value);
    } else if (operatorNameToSymbol.has(filter.operator)) {
      query.orWhere(filter.name, operatorNameToSymbol.get(filter.operator), filter.value);
    } else {
      throw `Unsupported filter operator ${filter.operator}`;
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