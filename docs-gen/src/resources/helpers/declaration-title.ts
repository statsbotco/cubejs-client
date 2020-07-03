import { DeclarationReflection, ReflectionKind, ParameterType } from 'typedoc';
import { heading } from './heading';
import { memberSymbol } from './member-symbol';
import { type } from './type';
import { ReferenceType, Type, TypeParameterReflection, IntrinsicType } from 'typedoc/dist/lib/models';
import { TypeReference } from 'typescript';

export function declarationTitle(this: DeclarationReflection, showSymbol: boolean) {
  // if (this.type?.type !== 'union' && this.type?.type !== 'tuple' && this.kind !== ReflectionKind.EnumMember) {
  //   return '';
  // }

  const md = [];
  const isOptional = this.flags.map((flag) => flag).includes('Optional');

  if (
    this.parent &&
    this.parent.kind !== ReflectionKind.ObjectLiteral &&
    this.parent.kind !== ReflectionKind.Enum &&
    this.kind !== ReflectionKind.TypeAlias
  ) {
    md.push(heading(3));
  }

  if (showSymbol) {
    md.push(memberSymbol.call(this));
  }

  md.push(`**${this.name}**${isOptional ? '? ' : ''}`);

  if (this.typeHierarchy?.types.length) {
    const [parent] = this.typeHierarchy.types;
    if (parent instanceof ReferenceType) {
      const name = parent.reflection === undefined ? parent.symbolFullyQualifiedName : parent.name;

      md.push('extends');
      md.push(`**${name}**`);

      if (parent.typeArguments) {
        md.push(`‹${parent.typeArguments.map((typeArgument) => type.call(typeArgument)).join(', ')}›`.trim());
      }
    }
  }

  // We want to display enum members like:
  // • DAY = "day"
  if (this.kind !== ReflectionKind.EnumMember) {
    md[md.length - 1] += ':';
  }

  if (this.type) {
    md.push(`*${type.call(this.type)}*`);
  }
  if (this.defaultValue) {
    md.push(`= ${this.defaultValue}`);
  }

  return md.join(' ');
}
