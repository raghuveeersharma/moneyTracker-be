import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { User, Transaction, Contact, Message } from './models';
import { connectDB } from './config/db';

dotenv.config();

const importData = async () => {
  try {
    await connectDB();

    await User.deleteMany();
    await Transaction.deleteMany();
    await Contact.deleteMany();
    await Message.deleteMany();

    console.log('Data Cleared...');

    // Create 10 Users
    const users = [];
    const passwordHash = await bcrypt.hash('123456', 10);

    for (let i = 0; i < 10; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        users.push({
            username: faker.internet.username({ firstName, lastName }),
            email: faker.internet.email({ firstName, lastName }),
            passwordHash,
        });
    }

    const createdUsers = await User.insertMany(users);
    const adminUser = createdUsers[0]; // We can use this one for testing

    console.log(`Created 10 Users. Admin: ${adminUser.email} / 123456`);

    // Create Contacts & Transactions for each user
    const transactions = [];

    for (const user of createdUsers) {
        // Create 5 contacts for each user
        for (let i = 0; i < 5; i++) {
            await Contact.create({
                userId: user._id,
                name: faker.person.fullName(),
                phone: faker.phone.number(),
            });
        }

        // Create 10 Transactions
        for (let i = 0; i < 10; i++) {
            transactions.push({
                userId: user._id,
                user: user._id, // Add this field
                type: Math.random() > 0.5 ? 'lend' : 'borrow',
                amount: parseFloat(faker.finance.amount({ min: 10, max: 1000, dec: 2 })),
                counterpartyName: faker.person.fullName(),
                status: Math.random() > 0.3 ? 'pending' : 'paid',
                date: faker.date.past(),
                notes: faker.lorem.sentence(),
            });
        }
    }

    await Transaction.insertMany(transactions);
    console.log(`Created ${transactions.length} Transactions.`);

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
    // destroyData();
} else {
    importData();
}
