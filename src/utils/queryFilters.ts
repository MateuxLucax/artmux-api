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

export function addFilters(query: Knex.QueryBuilder, filters: Filter[]) {
  for (const filter of filters) {
    if (filter.operator == 'between') {
      query.andWhereBetween(filter.name, filter.value);
    } else if (filter.operator == 'contains' || filter.operator == 'startsWith' || filter.operator == 'endsWith') {
      let value = filter.value;
      if (filter.operator == 'contains' || filter.operator == 'startsWith') {
        value = '%' + value;
      }
      if (filter.operator == 'contains' || filter.operator == 'endsWith') {
        value = value + '%';
      }
      query.andWhereILike(filter.name, value);
    } else if (operatorNameToSymbol.has(filter.operator)) {
      query.andWhere(filter.name, operatorNameToSymbol.get(filter.operator), filter.value);
    } else {
      throw `Unsupported filter operator ${filter.operator}`;
    }
  }
}