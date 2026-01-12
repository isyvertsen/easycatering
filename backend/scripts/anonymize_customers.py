#!/usr/bin/env python3
"""
Customer Data Anonymization Script

This script anonymizes personally identifiable information (PII) in the tblkunder table
using the Faker library to generate realistic but fake data.
"""

import asyncio
import logging
import sys
import os
from typing import List, Optional
from faker import Faker
from faker.providers import internet, phone_number
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.infrastructure.database.session import AsyncSessionLocal
from app.models.kunder import Kunder
from app.models.kunde_gruppe import Kundegruppe

# Initialize Faker with Norwegian locale for more realistic data
fake = Faker('no_NO')
fake.add_provider(internet)
fake.add_provider(phone_number)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CustomerAnonymizer:
    """Handles anonymization of customer data in tblkunder table."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.fake = fake
        
    async def anonymize_single_customer(self, customer_id: int) -> bool:
        """
        Anonymize a single customer by ID.
        
        Args:
            customer_id: The ID of the customer to anonymize
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get the customer
            result = await self.session.execute(
                select(Kunder).where(Kunder.kundeid == customer_id)
            )
            customer = result.scalar_one_or_none()
            
            if not customer:
                logger.warning(f"Customer with ID {customer_id} not found")
                return False
            
            # Generate anonymized data
            anonymized_data = self._generate_anonymized_data()
            
            # Update the customer
            await self.session.execute(
                update(Kunder)
                .where(Kunder.kundeid == customer_id)
                .values(**anonymized_data)
            )
            
            await self.session.commit()
            logger.info(f"Successfully anonymized customer ID {customer_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error anonymizing customer ID {customer_id}: {str(e)}")
            await self.session.rollback()
            return False
    
    async def anonymize_customers_by_group(self, batch_size: int = 100, kundegruppe: Optional[int] = None) -> dict:
        """
        Anonymize customers in batches, optionally filtered by kundegruppe.
        
        Args:
            batch_size: Number of customers to process in each batch
            kundegruppe: Optional customer group ID to filter by (if None, anonymizes all customers)
            
        Returns:
            dict: Statistics about the anonymization process
        """
        stats = {
            'total_processed': 0,
            'successful': 0,
            'failed': 0,
            'batches': 0,
            'kundegruppe_filter': kundegruppe
        }
        
        try:
            # Build query with optional kundegruppe filter
            query = select(Kunder.kundeid)
            if kundegruppe is not None:
                query = query.where(Kunder.kundegruppe == kundegruppe)
            
            count_result = await self.session.execute(query)
            all_customer_ids = [row[0] for row in count_result.fetchall()]
            total_customers = len(all_customer_ids)
            
            filter_msg = f" in kundegruppe {kundegruppe}" if kundegruppe else ""
            logger.info(f"Starting anonymization of {total_customers} customers{filter_msg}")
            
            # Process in batches
            for i in range(0, total_customers, batch_size):
                batch_ids = all_customer_ids[i:i + batch_size]
                stats['batches'] += 1
                
                logger.info(f"Processing batch {stats['batches']}: customers {i+1} to {min(i+batch_size, total_customers)}")
                
                # Generate batch anonymization data
                batch_updates = []
                for customer_id in batch_ids:
                    anonymized_data = self._generate_anonymized_data()
                    anonymized_data['kundeid'] = customer_id
                    batch_updates.append(anonymized_data)
                
                # Bulk update
                try:
                    for data in batch_updates:
                        customer_id = data.pop('kundeid')
                        await self.session.execute(
                            update(Kunder)
                            .where(Kunder.kundeid == customer_id)
                            .values(**data)
                        )
                    
                    await self.session.commit()
                    stats['successful'] += len(batch_ids)
                    logger.info(f"Successfully processed batch {stats['batches']}")
                    
                except Exception as e:
                    await self.session.rollback()
                    stats['failed'] += len(batch_ids)
                    logger.error(f"Error processing batch {stats['batches']}: {str(e)}")
                
                stats['total_processed'] += len(batch_ids)
            
            logger.info(f"Anonymization complete. Stats: {stats}")
            return stats
            
        except Exception as e:
            import traceback
            error_msg = f"Error in bulk anonymization: {str(e)}\nTraceback: {traceback.format_exc()}"
            logger.error(error_msg)
            stats['errors'] = stats.get('errors', [])
            stats['errors'].append(error_msg)
            try:
                await self.session.rollback()
            except Exception as rollback_error:
                logger.error(f"Error during rollback: {str(rollback_error)}")
            return stats
    
    async def anonymize_all_customers(self, batch_size: int = 100) -> dict:
        """
        Anonymize all customers in batches (backward compatibility method).
        
        Args:
            batch_size: Number of customers to process in each batch
            
        Returns:
            dict: Statistics about the anonymization process
        """
        return await self.anonymize_customers_by_group(batch_size, None)
    
    def _generate_anonymized_data(self) -> dict:
        """
        Generate anonymized data for a customer.
        
        Returns:
            dict: Dictionary of anonymized field values
        """
        # Generate consistent fake data
        first_name = self.fake.first_name()
        last_name = self.fake.last_name()
        company_name = self.fake.company()
        
        return {
            'kundenavn': f"{first_name} {last_name}",
            'kontaktid': self.fake.uuid4()[:20],  # Limit to reasonable length
            'telefonnummer': self.fake.phone_number(),
            'adresse': self.fake.street_address(),
            'postboks': self.fake.random_int(min=1, max=9999) if self.fake.boolean(chance_of_getting_true=30) else None,
            'postnr': self.fake.postcode(),
            'sted': self.fake.city(),
            'e_post': self.fake.email(),
            'e_post2': self.fake.email() if self.fake.boolean(chance_of_getting_true=20) else None,
            'mobilnummer': self.fake.phone_number(),
            'webside': f"https://www.{self.fake.domain_name()}" if self.fake.boolean(chance_of_getting_true=40) else None,
            'merknad': self._generate_fake_note(),
            'menyinfo': self._generate_fake_menu_info(),
        }
    
    def _generate_fake_note(self) -> Optional[str]:
        """Generate a fake note/remark."""
        if not self.fake.boolean(chance_of_getting_true=60):
            return None
        
        notes = [
            "Vanlig levering",
            "Ring før levering",
            "Levering ved bakdør",
            "Kontakt vaktmester",
            "Spesielle leveringsinstruksjoner",
            "Levering mellom 10-12",
            "Kun ukedager",
        ]
        return self.fake.random_element(notes)
    
    def _generate_fake_menu_info(self) -> Optional[str]:
        """Generate fake menu information."""
        if not self.fake.boolean(chance_of_getting_true=40):
            return None
        
        menu_info = [
            "Standard meny",
            "Vegetarisk alternativ",
            "Glutenfri meny",
            "Laktosefri alternativ",
            "Diabetikermeny",
            "Energirik kost",
        ]
        return self.fake.random_element(menu_info)


async def anonymize_customer_by_id(customer_id: int) -> bool:
    """
    Anonymize a single customer by ID.
    
    Args:
        customer_id: The ID of the customer to anonymize
        
    Returns:
        bool: True if successful, False otherwise
    """
    async with AsyncSessionLocal() as session:
        anonymizer = CustomerAnonymizer(session)
        return await anonymizer.anonymize_single_customer(customer_id)


async def anonymize_all_customers(batch_size: int = 100, kundegruppe: Optional[int] = None) -> dict:
    """
    Anonymize customers in the database, optionally filtered by kundegruppe.
    
    Args:
        batch_size: Number of customers to process in each batch
        kundegruppe: Optional customer group ID to filter by
        
    Returns:
        dict: Statistics about the anonymization process
    """
    async with AsyncSessionLocal() as session:
        anonymizer = CustomerAnonymizer(session)
        return await anonymizer.anonymize_customers_by_group(batch_size, kundegruppe)


async def main():
    """Main function for running the script directly."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Anonymize customer data in tblkunder')
    parser.add_argument('--customer-id', type=int, help='Anonymize a specific customer by ID')
    parser.add_argument('--all', action='store_true', help='Anonymize all customers or customers in specified kundegruppe')
    parser.add_argument('--kundegruppe', type=int, help='Filter by customer group ID (kundegruppe)')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size for bulk operations')
    
    args = parser.parse_args()
    
    if args.customer_id:
        success = await anonymize_customer_by_id(args.customer_id)
        if success:
            print(f"Successfully anonymized customer ID {args.customer_id}")
        else:
            print(f"Failed to anonymize customer ID {args.customer_id}")
    elif args.all:
        if args.kundegruppe:
            print(f"Starting anonymization for kundegruppe {args.kundegruppe}...")
            stats = await anonymize_all_customers(args.batch_size, args.kundegruppe)
            print(f"Anonymization complete for kundegruppe {args.kundegruppe}: {stats}")
        else:
            print("Starting full database anonymization...")
            stats = await anonymize_all_customers(args.batch_size)
            print(f"Anonymization complete: {stats}")
    else:
        print("Please specify either --customer-id or --all")
        if args.kundegruppe:
            print("Note: --kundegruppe requires --all flag")
        parser.print_help()


if __name__ == "__main__":
    asyncio.run(main())