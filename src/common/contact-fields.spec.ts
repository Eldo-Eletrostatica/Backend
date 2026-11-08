import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  INVALID_BUSINESS_CUSTOMER_NAME_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  INVALID_INDIVIDUAL_CUSTOMER_NAME_MESSAGE,
  INVALID_PHONE_MESSAGE,
  IsBrazilianPhone,
  IsBusinessCustomerName,
  IsCustomerEmail,
  IsIndividualCustomerName,
} from './contact-fields';

class TestPhoneDto {
  @IsBrazilianPhone()
  phone: string;
}

class TestIndividualCustomerNameDto {
  @IsIndividualCustomerName()
  name: string;
}

class TestBusinessCustomerNameDto {
  @IsBusinessCustomerName()
  name: string;
}

class TestCustomerEmailDto {
  @IsCustomerEmail()
  email: string;
}

describe('contact-fields (unit)', () => {
  describe('IsBrazilianPhone', () => {
    it.each([
      ['curto demais', '619999'],
      ['DDD começando com 0', '01999999999'],
      ['celular de 11 dígitos sem o 9', '61899999999'],
      ['celular incompleto de 10 dígitos começando por 9', '6199998888'],
      ['com máscara', '(61) 99999-9999'],
      ['com letras', '6199999abcd'],
    ])(
      'recusa telefone inválido por motivo de %s: %s',
      async (_reason, phone) => {
        const dto = plainToInstance(TestPhoneDto, { phone });
        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.matches).toBe(INVALID_PHONE_MESSAGE);
      },
    );

    it.each([
      ['celular de 11 dígitos', '61999998888'],
      ['telefone fixo de 10 dígitos', '6133334444'],
      ['telefone fixo com dígito inicial 2', '1122334455'],
    ])('aceita telefone válido no caso %s: %s', async (_reason, phone) => {
      const dto = plainToInstance(TestPhoneDto, { phone });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('IsIndividualCustomerName', () => {
    it.each([
      ['com apenas uma letra', 'M'],
      ['com número', 'Maria 2'],
      ['com símbolo arroba', 'Maria@Souza'],
      ['terminando em hífen', 'Maria-'],
      ['começando em hífen', '-Maria'],
    ])(
      'recusa nome individual inválido por motivo de %s: %s',
      async (_reason, name) => {
        const dto = plainToInstance(TestIndividualCustomerNameDto, { name });
        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.matches).toBe(
          INVALID_INDIVIDUAL_CUSTOMER_NAME_MESSAGE,
        );
      },
    );

    it.each([
      ['nome simples com espaço', 'Maria Souza'],
      ['nome com acento e apóstrofo ASCII', "Joana D'Ávila"],
      ['nome com apóstrofo tipográfico', 'Joana D’Ávila'],
      ['nome composto com hífen', 'Ana-Clara Souza'],
    ])(
      'aceita nome individual válido no caso %s: %s',
      async (_reason, name) => {
        const dto = plainToInstance(TestIndividualCustomerNameDto, { name });
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      },
    );
  });

  describe('IsBusinessCustomerName', () => {
    it.each([
      ['com uma letra só', 'A'],
      ['vazio', ''],
    ])(
      'recusa razão social curta demais por motivo de %s: %s',
      async (_reason, name) => {
        const dto = plainToInstance(TestBusinessCustomerNameDto, { name });
        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.minLength).toBe(
          INVALID_BUSINESS_CUSTOMER_NAME_MESSAGE,
        );
      },
    );

    it.each([
      ['razão social de 2 caracteres', 'Oi'],
      ['razão social com número e símbolos', 'Metal 3 S/A & Cia. Ltda'],
    ])('aceita razão social válida no caso %s: %s', async (_reason, name) => {
      const dto = plainToInstance(TestBusinessCustomerNameDto, { name });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('IsCustomerEmail', () => {
    it.each([
      ['sem arroba', 'maria.email.com'],
      ['sem domínio', 'maria@'],
      ['sem usuário', '@email.com'],
    ])(
      'recusa e-mail inválido por motivo de %s: %s',
      async (_reason, email) => {
        const dto = plainToInstance(TestCustomerEmailDto, { email });
        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.isEmail).toBe(INVALID_EMAIL_MESSAGE);
      },
    );

    it.each([
      ['e-mail corporativo', 'contato@metalurgica.com.br'],
      ['e-mail pessoal', 'maria@email.com'],
    ])('aceita e-mail válido no caso %s: %s', async (_reason, email) => {
      const dto = plainToInstance(TestCustomerEmailDto, { email });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
