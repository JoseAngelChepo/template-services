import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateContactDto } from './dto/create-contact.dto';
import { Contact, ContactDocument } from './schemas/contact.schema';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<ContactDocument>,
  ) {}

  async create(input: CreateContactDto) {
    const contact = await this.contactModel.create(input);

    return {
      id: contact.id,
      status: contact.status,
      createdAt: contact.get('createdAt') as Date,
    };
  }
}
